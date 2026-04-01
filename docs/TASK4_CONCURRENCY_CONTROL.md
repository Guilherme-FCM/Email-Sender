# TASK4: Concurrency Control

## Overview

Implement distributed concurrency control to guarantee that concurrent requests for the same email resource are safely serialized, preventing race conditions and duplicate sends under high load.

---

## Goals

- Prevent duplicate sends when multiple requests arrive simultaneously for the same payload
- Serialize concurrent writes to the same resource using distributed locks (Redis)
- Add optimistic locking with a `version` field in DynamoDB to detect and handle conflicts
- Limit concurrent in-flight operations to protect downstream services (backpressure)

---

## Architecture

```
Incoming Request
      │
      ▼
SendMailController
      │
      ▼
SendMailService.execute()
      │
      ├─► acquireLock(payloadHash)  ──► Redis SET NX EX
      │         │
      │    [lock acquired?]
      │         │ YES
      │         ▼
      │   isDuplicate(key)  ──► Redis GET
      │         │
      │    [not duplicate]
      │         ▼
      │   MailSender.sendMail()
      │         │
      │         ▼
      │   EmailRepository.save()  ──► DynamoDB conditional write (version check)
      │         │
      │         ▼
      │   cacheResult(key)  ──► Redis SETEX
      │         │
      │         ▼
      │   releaseLock(payloadHash)
      │
      └─► [lock not acquired] → return { status: 'processing' }
```

---

## Files to Create / Modify

### New Files

| File | Purpose |
|---|---|
| `src/utils/Lock.ts` | Distributed lock utility using Redis SET NX EX |
| `src/utils/Lock.test.ts` | Unit tests for lock acquire/release/expiry |

### Modified Files

| File | Change |
|---|---|
| `src/entities/Email.ts` | Add `version: number` field |
| `src/repositories/EmailRepository.ts` | Add conditional write with `attribute_not_exists(id)` + version increment |
| `src/services/SendMailService.ts` | Wrap execute() with lock acquire/release around the critical section |
| `package.json` | Add `p-limit` dependency for backpressure |
| `.env.example` | Add `LOCK_TTL_SECONDS` variable |

---

## Implementation Details

### 1. `src/utils/Lock.ts`

Uses Redis `SET key value NX EX ttl` — atomic acquire. Returns `true` if lock was acquired, `false` if already held.

```typescript
import RedisConnection from '../database/RedisConnection'

export default class Lock {
  private static readonly TTL = Number(process.env.LOCK_TTL_SECONDS) || 10

  static async acquire(resource: string): Promise<boolean> {
    const redis = await RedisConnection.getInstance()
    const result = await redis.set(`lock:${resource}`, '1', 'EX', Lock.TTL, 'NX')
    return result === 'OK'
  }

  static async release(resource: string): Promise<void> {
    const redis = await RedisConnection.getInstance()
    await redis.del(`lock:${resource}`)
  }
}
```

### 2. `src/entities/Email.ts`

Add `version` field (default `1`) for optimistic locking:

```typescript
export default class Email {
  constructor(
    public from: string,
    public to: string | string[],
    public subject: string,
    public message: string,
    public text?: string,
    public idempotencyKey?: string,
    public version: number = 1
  ) {}
}
```

### 3. `src/repositories/EmailRepository.ts`

Use `ConditionExpression: 'attribute_not_exists(id)'` on save to prevent duplicate writes under race conditions:

```typescript
const params = new PutCommand({
  TableName: DynamoDB.getTableName(),
  Item: { ...emailItem, version: email.version },
  ConditionExpression: 'attribute_not_exists(id)'
})

try {
  await dynamoDB.send(params)
} catch (error: any) {
  if (error.name === 'ConditionalCheckFailedException') return
  throw error
}
```

### 4. `src/services/SendMailService.ts`

Wrap the critical section with lock acquire/release:

```typescript
import Lock from '../utils/Lock'

async execute(data: SendMailRequest) {
  const key = generatePayloadHash(data)

  const acquired = await Lock.acquire(key)
  if (!acquired) {
    return { status: 'processing', message: 'Request is already being processed' }
  }

  try {
    const { isDuplicate, cachedResult } = await this.isDuplicate(key)
    if (isDuplicate) return cachedResult

    // ... send mail, save, cache ...
  } finally {
    await Lock.release(key)
  }
}
```

### 5. Backpressure with `p-limit`

Used in the worker layer (`EmailWorker.ts`) to cap concurrent SMTP sends:

```typescript
import pLimit from 'p-limit'
const limit = pLimit(Number(process.env.SMTP_MAX_CONNECTIONS) || 5)
```

---

## Environment Variables

```
# Concurrency
LOCK_TTL_SECONDS=10
```

---

## Acceptance Criteria

- [ ] Concurrent requests for the same payload: only one proceeds, others return `{ status: 'processing' }`
- [ ] Lock is always released (via `finally` block), even on errors
- [ ] DynamoDB conditional write silently ignores duplicate `id` inserts
- [ ] `version` field stored in DynamoDB for all new records
- [ ] Race condition unit tests pass 100%
- [ ] `p-limit` caps concurrent SMTP operations in the worker
