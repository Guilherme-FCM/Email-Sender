# Quick Start Guide - SQS Message Queue Integration

## 🚀 Get Started in 4 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Add to your `.env` file:
```env
# SQS
SQS_QUEUE_URL=http://localhost:4566/000000000000/emails-queue
SQS_DLQ_URL=http://localhost:4566/000000000000/emails-dlq
SQS_MAX_RETRIES=3
```

### Step 3: Start Services
```bash
docker-compose up
```

This starts: app, DynamoDB Local, Redis, and LocalStack (SQS).

### Step 4: Create SQS Queues in LocalStack
```bash
# Create Dead Letter Queue first
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name emails-dlq \
  --region us-east-1

# Create main queue with DLQ redrive policy
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name emails-queue \
  --attributes '{"RedrivePolicy":"{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:000000000000:emails-dlq\",\"maxReceiveCount\":\"3\"}"}' \
  --region us-east-1
```

## ✅ Verify Installation

### Check Health
```bash
curl http://localhost:3333/health
# Expected: {"status":"ok","timestamp":"..."}

curl http://localhost:3333/ready
# Expected: {"status":"ready","checks":{"redis":true,"dynamodb":true},"timestamp":"..."}
```

### Send an Email (Async)
```bash
curl -X POST http://localhost:3333/send-email \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: my-trace-id-001" \
  -d '{
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "subject": "Hello from SQS",
    "message": "<h1>Async email!</h1>"
  }'
```

Expected response (`202 Accepted`):
```json
{
  "status": "queued",
  "messageId": "abc123-sqs-id",
  "correlationId": "my-trace-id-001"
}
```

### Without Correlation ID Header
```bash
curl -X POST http://localhost:3333/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "subject": "Auto correlation ID",
    "message": "<p>Test</p>"
  }'
```

Expected response — `correlationId` auto-generated:
```json
{
  "status": "queued",
  "messageId": "def456-sqs-id",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 🔍 Monitor the Queue

### List Queues
```bash
aws --endpoint-url=http://localhost:4566 sqs list-queues --region us-east-1
```

### Check Queue Depth
```bash
aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/emails-queue \
  --attribute-names ApproximateNumberOfMessages \
  --region us-east-1
```

### Check DLQ
```bash
aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/emails-dlq \
  --attribute-names ApproximateNumberOfMessages \
  --region us-east-1
```

## 🧪 Run Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📊 What Changed?

### Controller — Before (Task 2)
```typescript
// Returns 200 after email is sent
const result = await service.execute({ from, to, subject, message, text })
return response.json(result)
```

### Controller — After (Task 3)
```typescript
// Returns 202 immediately after enqueuing
const messageId = await queueService.enqueue({ from, to, subject, message, text }, correlationId)
return response.status(202).json({ status: 'queued', messageId, correlationId })
```

## 📁 New Files

- `src/services/EmailQueueService.ts` — SQS producer
- `src/workers/EmailWorker.ts` — SQS consumer

## 🔧 Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `SQS_QUEUE_URL` | — | Main queue URL (required) |
| `SQS_DLQ_URL` | — | Dead Letter Queue URL |
| `SQS_MAX_RETRIES` | `3` | Max receive attempts before DLQ |
| `AWS_REGION` | `us-east-1` | AWS region |

## 🐛 Troubleshooting

### LocalStack Not Starting
```bash
# Check LocalStack logs
docker-compose logs localstack

# Verify LocalStack health
curl http://localhost:4566/_localstack/health
```

### Queue Not Found
```bash
# List existing queues
aws --endpoint-url=http://localhost:4566 sqs list-queues --region us-east-1

# Re-run queue creation commands from Step 4
```

### Worker Not Processing Messages
```bash
# Check app logs
docker-compose logs -f app

# Verify SQS_QUEUE_URL in environment
docker exec email-sender-app-1 env | grep SQS
```

### 202 But Email Not Delivered
The worker processes asynchronously — check app logs for worker output:
```bash
docker-compose logs -f app | grep "EmailWorker"
```

## 📚 Documentation

- [TASK3_SQS_INTEGRATION.md](./TASK3_SQS_INTEGRATION.md) — Full technical guide
- [TASK3_SUMMARY.md](./TASK3_SUMMARY.md) — Implementation summary
- [TASK2_QUICK_START.md](./TASK2_QUICK_START.md) — Redis setup (prerequisite)

## ⏭️ Next Steps

Ready for **Task 4: Concurrency Control**
- Distributed locks via Redis `SET NX EX`
- Optimistic locking with DynamoDB version fields
- Race condition prevention
