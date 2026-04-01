# TASK4 Quick Start: Concurrency Control

## 1. Install new dependency

```bash
npm install p-limit
npm install --save-dev @types/p-limit
```

## 2. Add environment variable

In `.env`:
```
LOCK_TTL_SECONDS=10
```

## 3. Implementation order

```
1. src/utils/Lock.ts                    ← create first (no deps)
2. src/utils/Lock.test.ts               ← tests alongside
3. src/entities/Email.ts                ← add version field
4. src/repositories/EmailRepository.ts  ← conditional write + version
5. src/services/SendMailService.ts      ← wrap execute() with lock
6. src/workers/EmailWorker.ts           ← add p-limit backpressure
```

## 4. Verify lock behavior manually

Start Redis and the API, then send two concurrent requests with the same payload:

```bash
curl -X POST http://localhost:3333/send-email \
  -H "Content-Type: application/json" \
  -d '{"from":"a@a.com","to":"b@b.com","subject":"Test","message":"<p>hi</p>"}' &

curl -X POST http://localhost:3333/send-email \
  -H "Content-Type: application/json" \
  -d '{"from":"a@a.com","to":"b@b.com","subject":"Test","message":"<p>hi</p>"}' &
```

Expected: one returns the sent result, the other returns `{ "status": "processing" }`.

## 5. Run tests

```bash
npm test -- --testPathPattern=Lock
npm test -- --coverage
```

Coverage target: 100% for `Lock.ts` and concurrency paths in `SendMailService.ts`.
