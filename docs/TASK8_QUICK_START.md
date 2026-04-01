# TASK8 — Quick Start

## Prerequisites

- Node.js 18+
- Docker (required for integration and feature tests)
- npm dependencies installed: `npm install`

---

## Step 1 — Run Unit Tests

```bash
npm test
```

Runs all `*.test.ts` files under `src/`. No Docker required.

Expected output:
```
Test Suites: 11 passed, 11 total
Tests:       XX passed, XX total
```

---

## Step 2 — Run Unit Tests with Coverage

```bash
npm run test:coverage
```

Generates a coverage report in `coverage/lcov-report/index.html`.

Coverage thresholds are enforced automatically. The command exits with a non-zero code if any threshold is not met:

| Scope | Minimum |
|---|---|
| Global (lines, functions, branches, statements) | 80% |
| `src/services/` | 90% |
| `src/repositories/` | 85% |

---

## Step 3 — Run Integration Tests

Requires Docker to be running.

```bash
npm run test:integration
```

This command runs tests under `tests/integration/` sequentially (`--runInBand`). Each suite manages its own container lifecycle:

- `amazon/dynamodb-local` — for `EmailRepository.integration.test.ts`
- `redis:alpine` — for `Redis.integration.test.ts`, `idempotency.integration.test.ts`, `concurrency.integration.test.ts`

First run will pull Docker images automatically. Subsequent runs use the local cache.

Expected output:
```
PASS tests/integration/EmailRepository.integration.test.ts
PASS tests/integration/Redis.integration.test.ts
PASS tests/integration/idempotency.integration.test.ts
PASS tests/integration/concurrency.integration.test.ts
```

---

## Step 4 — Run Feature Tests

Requires Docker to be running.

```bash
npm run test:feature
```

Runs `tests/feature/sendEmail.feature.test.ts` against a real Express app instance. Validates all API endpoints end-to-end.

---

## Step 5 — Verify TASK4 Concurrency Tests Pass

The concurrency integration test is the key validator for TASK4 acceptance criteria:

```bash
npm run test:integration -- --testPathPattern=concurrency
```

Expected: 10 concurrent identical requests result in exactly 1 email sent.

---

## Common Commands

```bash
# Unit tests only
npm test

# Unit tests with coverage
npm run test:coverage

# Integration tests (Docker required)
npm run test:integration

# Feature tests (Docker required)
npm run test:feature

# Watch mode for TDD
npm run test:watch

# Run a specific test file
npx jest src/services/SendMailService.test.ts

# Run a specific integration test
npx jest tests/integration/idempotency.integration.test.ts --runInBand
```

---

## Troubleshooting

**Docker not running**
```
Error: connect ECONNREFUSED /var/run/docker.sock
```
Start Docker Desktop and retry.

**Port conflict during integration tests**
Integration tests use random ports assigned by `testcontainers`. If you see port conflicts, ensure no other DynamoDB Local or Redis instances are running on the default ports (8000, 6379).

**Coverage threshold failure**
```
Jest: "global" coverage threshold for lines (80%) not met: XX%
```
A new file was added without tests. Add unit tests for the new file and re-run `npm run test:coverage`.

**Slow first run**
`testcontainers` pulls Docker images on first run. This is a one-time cost. Subsequent runs use the local Docker image cache.
