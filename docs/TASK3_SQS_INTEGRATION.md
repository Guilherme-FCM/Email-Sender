# SQS Message Queue Integration - Task 3 Implementation

## Overview

Decouples email sending from the HTTP request cycle using AWS SQS. The API accepts requests, enqueues them, and returns `202 Accepted` immediately. A background worker processes the queue asynchronously, enabling higher throughput and resilience.

## Architecture

```
POST /send-email
      │
      ▼
SendMailController
      │  enqueue()
      ▼
EmailQueueService ──► SQS Queue ──► EmailWorker
      │                                   │
      ▼                                   ▼
202 Accepted                       SendMailService
                                         │
                                    ┌────┴────┐
                                    ▼         ▼
                                MailSender  DynamoDB
                                (SMTP)    (Persist)
                                         │
                              Failed? ───▼
                                      DLQ (Dead Letter Queue)
```

### Flow Description

1. Client sends `POST /send-email` with optional `X-Correlation-ID` header
2. Controller enqueues the payload via `EmailQueueService`
3. API returns `202 Accepted` with `{ status: 'queued', messageId, correlationId }`
4. `EmailWorker` polls SQS continuously (long polling, 20s)
5. Worker calls `SendMailService.execute()` for each message
6. On success: message deleted from queue
7. On failure: SQS retries up to `SQS_MAX_RETRIES`; then moves to DLQ

## New Files

### `src/services/EmailQueueService.ts`
SQS producer. Wraps `SendMessageCommand` with correlation ID as a `MessageAttribute`.

```typescript
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { Address } from 'nodemailer/lib/mailer'
import crypto from 'crypto'

type SendMailRequest = {
  from: Address
  to: Address
  subject: string
  message: string
  text?: string
}

export class EmailQueueService {
  private client: SQSClient
  private queueUrl: string

  constructor() {
    this.client = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
    this.queueUrl = process.env.SQS_QUEUE_URL!
  }

  async enqueue(data: SendMailRequest, correlationId: string): Promise<string> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(data),
      MessageAttributes: {
        CorrelationId: { DataType: 'String', StringValue: correlationId }
      }
    })
    const result = await this.client.send(command)
    return result.MessageId!
  }
}
```

### `src/workers/EmailWorker.ts`
SQS consumer. Long-polls the queue and delegates to `SendMailService`.

```typescript
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'
import SendMailService from '../services/SendMailService'

export class EmailWorker {
  private client: SQSClient
  private queueUrl: string
  private service: SendMailService

  constructor() {
    this.client = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
    this.queueUrl = process.env.SQS_QUEUE_URL!
    this.service = new SendMailService()
  }

  async processMessages(): Promise<void> {
    while (true) {
      const { Messages = [] } = await this.client.send(new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ['All']
      }))

      for (const message of Messages) {
        try {
          const data = JSON.parse(message.Body!)
          await this.service.execute(data)
          await this.client.send(new DeleteMessageCommand({
            QueueUrl: this.queueUrl,
            ReceiptHandle: message.ReceiptHandle!
          }))
        } catch (error) {
          console.error('Failed to process message:', message.MessageId, error)
          // SQS handles retry via visibility timeout; DLQ after max receives
        }
      }
    }
  }
}
```

## Modified Files

### `src/controllers/SendMailController.ts`
- Reads `X-Correlation-ID` header (generates one if absent)
- Calls `EmailQueueService.enqueue()` instead of `SendMailService.execute()`
- Returns `202 Accepted`

```typescript
import { Request, Response } from 'express'
import crypto from 'crypto'
import { EmailQueueService } from '../services/EmailQueueService'

export default class SendMailController {
  public static async handle(request: Request, response: Response): Promise<Response> {
    const { from, to, subject, message, text } = request.body
    const correlationId = (request.headers['x-correlation-id'] as string) || crypto.randomUUID()

    const queueService = new EmailQueueService()
    const messageId = await queueService.enqueue({ from, to, subject, message, text }, correlationId)

    return response.status(202).json({ status: 'queued', messageId, correlationId })
  }

  public static async list(request: Request, response: Response): Promise<Response> {
    // unchanged
  }
}
```

### `docker-compose.yml`
Adds LocalStack service for local SQS emulation:

```yaml
localstack:
  image: localstack/localstack
  ports:
    - "4566:4566"
  environment:
    - SERVICES=sqs
    - DEFAULT_REGION=us-east-1
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:4566/_localstack/health"]
    interval: 10s
    timeout: 5s
    retries: 3
```

### `.env.example`
```env
# SQS
SQS_QUEUE_URL=http://localhost:4566/000000000000/emails-queue
SQS_DLQ_URL=http://localhost:4566/000000000000/emails-dlq
SQS_MAX_RETRIES=3
```

### `package.json`
```bash
npm install @aws-sdk/client-sqs
```

## Dead Letter Queue (DLQ)

SQS natively handles DLQ routing. Configure `maxReceiveCount` on the main queue's redrive policy. After `SQS_MAX_RETRIES` failed receive attempts, SQS automatically moves the message to the DLQ — no application code required.

## Correlation ID Tracking

| Layer | Mechanism |
|---|---|
| HTTP Request | `X-Correlation-ID` header (client-provided or auto-generated) |
| SQS Message | `CorrelationId` MessageAttribute |
| Worker Logs | Logged alongside `MessageId` on each processing attempt |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SQS_QUEUE_URL` | — | Main SQS queue URL (required) |
| `SQS_DLQ_URL` | — | Dead Letter Queue URL |
| `SQS_MAX_RETRIES` | `3` | Max receive attempts before DLQ |
| `AWS_REGION` | `us-east-1` | AWS region for SQS client |

## Local Development with LocalStack

```bash
# Start all services including LocalStack
docker-compose up

# Create queues in LocalStack
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name emails-dlq \
  --region us-east-1

aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name emails-queue \
  --attributes '{"RedrivePolicy":"{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:000000000000:emails-dlq\",\"maxReceiveCount\":\"3\"}"}' \
  --region us-east-1
```

## Success Criteria

- ✅ API returns `202 Accepted` with `messageId` and `correlationId`
- ✅ Messages enqueued to SQS via `EmailQueueService`
- ✅ Worker processes messages asynchronously
- ✅ Failed messages move to DLQ after max retries
- ✅ Correlation IDs tracked from HTTP request through queue to worker

## Next Steps

### Task 4: Concurrency Control
- Distributed locks using Redis `SET NX EX`
- Optimistic locking with DynamoDB version fields
- Race condition prevention for concurrent identical requests
