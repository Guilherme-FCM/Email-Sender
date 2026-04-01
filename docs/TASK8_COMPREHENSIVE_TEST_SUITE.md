# TASK8 — Comprehensive Test Suite

## Overview

This document describes the complete test strategy for the Email-Sender service, covering unit, integration, feature, idempotency, and concurrency tests. It also documents the closure of **TASK4 (Concurrency Control)** validation through dedicated race-condition tests.

---

## Coverage Targets

| Scope | Target |
|---|---|
| Overall | 80%+ |
| Services (`src/services/`) | 90%+ |
| Repositories (`src/repositories/`) | 85%+ |
| Critical paths (idempotency, concurrency) | 100% |

Thresholds are enforced in `jest.config.js` via `coverageThreshold` so the CI pipeline fails automatically if coverage drops below the defined targets.

---

## Test Types

### 1. Unit Tests (already in place)

Colocated with source files using the `.test.ts` suffix. All external dependencies are mocked.

| File | What is tested |
|---|---|
| `src/services/SendMailService.test.ts` | Idempotency flow, duplicate detection, Redis cache, Lock integration, error handling |
| `src/services/MailSender.test.ts` | SMTP transport creation, validation, secure flag, mail options |
| `src/repositories/EmailRepository.test.ts` | DynamoDB PutCommand, ScanCommand, conditional write, idempotency key persistence |
| `src/utils/Lock.test.ts` | Redis SET NX EX acquire, release, Redis unavailability fallback |
| `src/utils/hashGenerator.test.ts` | SHA-256 determinism, Address object handling, field sensitivity |
| `src/queues/SQSEmailQueue.test.ts` | SQS SendMessageCommand, CorrelationId attribute, error propagation |
| `src/workers/EmailWorker.test.ts` | Message polling, batch processing, delete-on-success, error isolation, long polling |
| `src/controllers/SendMailController.test.ts` | 202 response, correlation ID passthrough, queue injection, 500 on failure |
| `src/controllers/HealthController.test.ts` | Liveness probe, readiness probe, partial failure (503) |
| `src/database/DynamoDBConnection.test.ts` | Singleton, table auto-creation, credential validation |
| `src/database/RedisConnection.test.ts` | Singleton, event handlers, healthCheck, close, TTL operations |

### 2. Integration Tests

Located under `tests/integration/`. Use real containerized dependencies via `testcontainers` — no mocks.

#### `tests/integration/EmailRepository.integration.test.ts`
- Spins up `amazon/dynamodb-local` container
- Validates `save()` persists all fields including `idempotencyKey` and `version`
- Validates `all()` returns persisted records
- Validates `ConditionalCheckFailedException` is silently swallowed on duplicate `id`

#### `tests/integration/Redis.integration.test.ts`
- Spins up `redis:alpine` container
- Validates `getInstance()` connects and returns a working client
- Validates `healthCheck()` returns `true` on live Redis
- Validates `setex` TTL expiry behaviour
- Validates `close()` disconnects cleanly

#### `tests/integration/idempotency.integration.test.ts`
- Uses real Redis container
- Sends the same email payload twice through `SendMailService`
- Asserts the second call returns the cached result without calling `MailSender`
- Asserts TTL expiry allows a third call to go through

#### `tests/integration/concurrency.integration.test.ts`
- Uses real Redis container
- Fires 10 concurrent `SendMailService.execute()` calls with identical payload
- Asserts `MailSender.sendMail` is called exactly once (exactly-once semantics)
- Asserts `Lock.acquire` serialises access (only one acquires, others return `processing`)

### 3. Feature Tests

Located under `tests/feature/`. Use `supertest` against a real Express app instance with mocked SMTP and containerized Redis + DynamoDB.

#### `tests/feature/sendEmail.feature.test.ts`
- `POST /send-email` → 202 with `{ status: 'queued', messageId, correlationId }`
- `POST /send-email` with `X-Correlation-ID` header → same ID echoed back
- `POST /send-email` without body → 500 with error message
- `GET /emails` → 200 with items array
- `GET /health` → 200 `{ status: 'ok' }`
- `GET /ready` → 200 or 503 depending on dependency state

---

## TASK4 Concurrency Control — Validation

TASK4 introduced `src/utils/Lock.ts` (Redis SET NX EX) and the `version` field on the `Email` entity for optimistic locking. The following tests close all TASK4 acceptance criteria:

| Acceptance Criterion | Covered By |
|---|---|
| Concurrent requests for same resource properly serialised | `concurrency.integration.test.ts` |
| Version conflicts detected and handled | `EmailRepository.integration.test.ts` (ConditionalCheckFailedException) |
| Lock acquisition/release working correctly | `Lock.test.ts` (unit) + `concurrency.integration.test.ts` |
| Race condition tests pass 100% | `concurrency.integration.test.ts` |
| Backpressure control with `p-limit` | `EmailWorker.test.ts` (concurrent batch processing) |

---

## jest.config.js Changes

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    './src/services/': {
      lines: 90,
      functions: 90,
    },
    './src/repositories/': {
      lines: 85,
      functions: 85,
    },
  },
}
```

---

## package.json Script Changes

```json
"test:integration": "jest --testPathPattern=tests/integration --runInBand",
"test:feature": "jest --testPathPattern=tests/feature --runInBand",
"test:coverage": "jest --coverage"
```

`--runInBand` is required for integration and feature tests because each suite manages its own container lifecycle and parallel execution would cause port conflicts.

---

## New Dependencies

| Package | Type | Purpose |
|---|---|---|
| `testcontainers` | devDependency | Spin up Docker containers (DynamoDB Local, Redis) in tests |
| `supertest` | devDependency | HTTP assertions against Express app |
| `@types/supertest` | devDependency | TypeScript types for supertest |

---

## Directory Structure After TASK8

```
Email-Sender/
├── src/                          # Unit tests colocated with source
│   ├── controllers/*.test.ts
│   ├── database/*.test.ts
│   ├── queues/*.test.ts
│   ├── repositories/*.test.ts
│   ├── services/*.test.ts
│   ├── utils/*.test.ts
│   └── workers/*.test.ts
└── tests/
    ├── integration/
    │   ├── EmailRepository.integration.test.ts
    │   ├── Redis.integration.test.ts
    │   ├── idempotency.integration.test.ts
    │   └── concurrency.integration.test.ts
    └── feature/
        └── sendEmail.feature.test.ts
```

---

## Running Tests

```bash
# Unit tests only
npm test

# Unit tests with coverage report
npm run test:coverage

# Integration tests (requires Docker)
npm run test:integration

# Feature tests (requires Docker)
npm run test:feature

# Watch mode for TDD
npm run test:watch
```

---

## Acceptance Criteria Checklist

- [ ] All unit tests pass consistently
- [ ] Coverage thresholds enforced in `jest.config.js`
- [ ] Integration tests use real containerized dependencies
- [ ] Idempotency tests validate exactly-once semantics
- [ ] Concurrency tests validate race condition safety
- [ ] Feature tests cover complete HTTP flows
- [ ] `testcontainers` added to devDependencies
- [ ] `test:integration` and `test:feature` scripts added to `package.json`
