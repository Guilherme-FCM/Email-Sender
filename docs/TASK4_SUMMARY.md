# TASK4 Summary: Concurrency Control

## What Will Be Implemented

Distributed concurrency control to prevent race conditions and duplicate sends under concurrent load.

## Files Changed

| File | Action |
|---|---|
| `src/utils/Lock.ts` | CREATE — Redis-based distributed lock (SET NX EX) |
| `src/utils/Lock.test.ts` | CREATE — Unit tests: acquire, release, expiry, contention |
| `src/entities/Email.ts` | MODIFY — Add `version: number` field |
| `src/repositories/EmailRepository.ts` | MODIFY — Conditional write (`attribute_not_exists(id)`) + version field |
| `src/services/SendMailService.ts` | MODIFY — Wrap critical section with lock acquire/release in `finally` |
| `package.json` | MODIFY — Add `p-limit` dependency |
| `.env.example` | MODIFY — Add `LOCK_TTL_SECONDS` |

## Success Criteria

- Concurrent identical requests: exactly one proceeds, others return `{ status: 'processing' }`
- Lock always released via `finally` (no deadlocks)
- DynamoDB conditional write prevents duplicate records
- Race condition tests pass 100%
- Backpressure limits concurrent SMTP sends

## Dependencies on Previous Tasks

- TASK2 (Redis): `RedisConnection` singleton already available
- TASK3 (SQS): `EmailWorker` already exists — `p-limit` applied there

## Risk

- If Redis is down and `REDIS_REQUIRED=true`, lock acquisition fails and the request is rejected — this is intentional (fail-safe)
- If `REDIS_REQUIRED=false`, lock is skipped and idempotency falls back to DynamoDB conditional write only
