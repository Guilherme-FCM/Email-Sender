<h1 align="center">Email-Sender 📧</h1>
<p align="center">Production-grade Node.js API for transactional email delivery</p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white"/>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-4.7-3178C6?logo=typescript&logoColor=white"/>
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue"/>
</p>

<p align="center">
  <a href="#about">About</a> |
  <a href="#architecture">Architecture</a> |
  <a href="#features">Features</a> |
  <a href="#getting-started">Getting Started</a> |
  <a href="#api">API</a> |
  <a href="#technologies">Technologies</a> |
  <a href="#license">License</a>
</p>

---

## About

Email-Sender is a REST API built for high-scale transactional email delivery. It goes beyond a simple SMTP wrapper — it handles **idempotency**, **distributed locking**, **asynchronous processing via SQS**, and **Redis-backed caching** to guarantee exactly-once delivery even under concurrent or retry scenarios.

---

## Architecture

```
Client
  │
  ▼
Express API  ──►  SQS Queue  ──►  SQSEmailWorker
  │                                     │
  │                                     ▼
  │                              SendMailUseCase
  │                             /       │        \
  │                            ▼        ▼         ▼
  │                    IEmailSender  ICacheService  ILockService
  │                         │            │              │
  │                         ▼            ▼              ▼
  │               NodemailerEmailSender  RedisCacheService  RedisLockService
  │
  └──► IEmailRepository
             │
             ▼
     DynamoDBEmailRepository
```

The codebase uses **interface-driven design** — every infrastructure dependency is hidden behind a port interface, making the business logic independently testable and the adapters swappable.

---

## Features

- **Automatic idempotency** — SHA-256 hash of `from + to + subject` prevents duplicate sends within a configurable TTL window
- **Distributed locking** — Redis `SET NX EX` prevents race conditions on concurrent identical requests
- **Async processing** — requests are queued to SQS and processed by a background worker, returning `202 Accepted` immediately
- **Health & readiness probes** — `/health` and `/ready` endpoints check Redis and DynamoDB connectivity
- **Correlation ID tracing** — `X-Correlation-ID` header propagated through the async flow
- **Interface-driven design** — all infrastructure dependencies behind port interfaces (`IEmailSender`, `IEmailRepository`, `ICacheService`, `ILockService`)

---

## Getting Started

### Prerequisites

- [Node.js 18+](https://nodejs.org/en/download/)
- [Docker](https://www.docker.com/)

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env
```

3. Start all infrastructure services (DynamoDB Local, Redis, LocalStack/SQS):

```bash
docker-compose up
```

4. Run in development mode:

```bash
npm run dev
# Running on http://localhost:3333
```

### Running Tests

```bash
npm test                 # run all tests
npm run test:watch       # watch mode
npm run test:coverage    # coverage report
```

---

## API

### `POST /send-email`

Queues an email for delivery. Returns `202 Accepted` immediately.

**Headers**

| Header | Required | Description |
|---|---|---|
| `X-Correlation-ID` | No | Trace ID propagated through the async flow. Auto-generated if absent. |

**Request body**

```json
{
  "from": "sender@example.com",
  "to": ["person1@example.com", "person2@example.com"],
  "subject": "Welcome",
  "message": "<h1>Hello!</h1>",
  "text": "Hello!"
}
```

**Response `202`**

```json
{
  "status": "queued",
  "messageId": "abc123",
  "correlationId": "uuid-here"
}
```

---

### `GET /emails`

Returns all emails stored in DynamoDB.

---

### `GET /health`

Liveness probe. Always returns `200` if the process is running.

```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

### `GET /ready`

Readiness probe. Checks Redis and DynamoDB connectivity.

```json
{ "status": "ready", "checks": { "redis": true, "dynamodb": true }, "timestamp": "..." }
```

Returns `503` if any dependency is unavailable.

---

## Technologies

| Layer | Technology |
|---|---|
| Runtime | [Node.js](https://nodejs.org/) + [TypeScript](https://www.typescriptlang.org/) |
| HTTP | [Express](https://expressjs.com/) |
| Email | [Nodemailer](https://nodemailer.com/) |
| Queue | [AWS SQS](https://aws.amazon.com/sqs/) via [@aws-sdk/client-sqs](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/) |
| Cache / Locks | [Redis](https://redis.io/) via [ioredis](https://github.com/redis/ioredis) |
| Database | [AWS DynamoDB](https://aws.amazon.com/dynamodb/) via [@aws-sdk/lib-dynamodb](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/) |
| Testing | [Jest](https://jestjs.io/) + [ts-jest](https://kulshekhar.github.io/ts-jest/) |
| Local AWS | [LocalStack](https://localstack.cloud/) |

---

## License

This project is under the [MIT](./LICENSE) license.

### Made by [Guilherme Feitosa](https://github.com/Guilherme-FCM/)
