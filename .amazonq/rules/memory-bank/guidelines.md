# Email-Sender Development Guidelines

## Production-Grade Requirements

### Performance Targets
- **Throughput**: Support thousands of requests per second
- **Latency**: P95 < 100ms, P99 < 200ms
- **Availability**: 99.9% uptime
- **Scalability**: Horizontal scaling via stateless design

### Test Coverage Requirements
- **Overall Coverage**: Minimum 80%
- **Critical Paths**: 100% coverage for idempotency and concurrency logic
- **Load Testing**: Validate throughput, latency, and resource usage under stress

## Code Quality Standards

### TypeScript Configuration
- **Strict Mode Enabled**: All code must pass TypeScript strict type checking
- **No Implicit Any**: Explicit type annotations required for all parameters and return values
- **ES Module Interop**: Use ES6 import/export syntax consistently
- **Target ES2016**: Write code compatible with ES2016 JavaScript features

### File Naming Conventions
- **PascalCase** for classes and components: `SendMailController.ts`, `EmailRepository.ts`
- **camelCase** for utility files: `routes.ts`, `server.ts`
- **Test files**: Colocate with source using `.test.ts` suffix: `MailSender.test.ts`
- **Configuration files**: Use lowercase with extensions: `jest.config.js`, `tsconfig.json`

### Import Organization
Follow this import order (observed in 5/5 files):
1. External dependencies (Node.js built-ins, npm packages)
2. AWS SDK imports
3. Internal project imports (services, repositories, entities)

Example from EmailRepository.ts:
```typescript
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import DynamoDB from '../database/DynamoDBConnection'
import Email from '../entities/Email'
```

### Code Formatting
- **Indentation**: 2 spaces (consistent across all TypeScript files)
- **Line Endings**: CRLF (Windows-style, as seen in all files)
- **Semicolons**: Optional - codebase uses mixed style (present in some files, absent in others)
- **String Quotes**: Single quotes preferred for strings
- **Template Literals**: Use for string interpolation and multi-line strings

## Architectural Patterns

### 1. Layered Architecture (100% adherence)
Maintain strict separation between layers:

**Controller Layer** (HTTP handling only):
```typescript
export default class SendMailController {
  public static async handle(request: Request, response: Response): Promise<Response> {
    const { from, to, subject, message, text } = request.body
    const service = new SendMailService()
    const result = await service.execute({ from, to, subject, message, text})
    
    if (result instanceof Error) {
      return response.status(400).json({ error: result.message })
    }
    return response.json(result)
  }
}
```

**Service Layer** (Business logic):
```typescript
export default class SendMailService {
  async execute(data: SendMailRequest) {
    // Duplicate detection logic
    // Email sending orchestration
    // Repository persistence
  }
}
```

**Repository Layer** (Data access):
```typescript
export class EmailRepository {
  async save(email: Email): Promise<void> {
    const dynamoDB = await DynamoDB.getInstance()
    // DynamoDB operations
  }
}
```

### 2. Static Controller Methods (100% adherence)
Controllers use static methods for route handlers:
```typescript
export default class SendMailController {
  public static async handle(request: Request, response: Response): Promise<Response>
  public static async list(request: Request, response: Response): Promise<Response>
}
```

### 3. Singleton Pattern for Connections
Database connections use singleton pattern with lazy initialization:
```typescript
export default class DynamoDBConnection {
  private static instance: DynamoDBDocumentClient | null = null
  
  static async getInstance(): Promise<DynamoDBDocumentClient> {
    if (!this.instance) {
      // Initialize connection
    }
    return this.instance
  }
}
```

### 4. Constructor-Based Dependency Injection
Services receive dependencies through constructor parameters:
```typescript
export default class MailSender {
  constructor(
    public from: Address,
    public to: Address,
    public subject: string,
    public message: string,
    public text?: string
  ) {}
}
```

### 5. Public Property Shorthand
Use TypeScript constructor parameter properties for simple data classes:
```typescript
export default class Email {
  constructor(
    public from: string,
    public to: string | string[],
    public subject: string,
    public message: string,
    public text?: string
  ) {}
}
```

## Error Handling Patterns

### Service Layer Error Handling
Return structured error objects instead of throwing:
```typescript
async execute(data: SendMailRequest) {
  try {
    // Business logic
    return result
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    }
  }
}
```

### Validation in Services
Validate inputs early and return Error objects:
```typescript
private validateFields(): Error | null {
  if (!this.from) return new Error('Sender email (from) is required.')
  if (!this.to) return new Error('Recipient email (to) is required.')
  if (!this.message) return new Error('A email message is required.')
  return null
}
```

### Controller Error Responses
Check for Error instances and return appropriate HTTP status:
```typescript
if (result instanceof Error) {
  return response.status(400).json({ error: result.message })
}
return response.json(result)
```

## AWS SDK Usage Patterns

### DynamoDB Command Pattern
Use AWS SDK v3 command pattern for all operations:
```typescript
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

const params = new PutCommand({
  TableName: DynamoDB.getTableName(),
  Item: { /* data */ }
})
await dynamoDB.send(params)
```

### DynamoDB Document Client
Use DynamoDBDocumentClient for simplified JavaScript object mapping:
```typescript
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

this.instance = DynamoDBDocumentClient.from(this.client)
```

### Environment-Based Configuration
Configure AWS services from environment variables:
```typescript
class DynamoDBConfig {
  private region = process.env.AWS_REGION || 'us-east-1'
  private accessKeyId = process.env.AWS_ACCESS_KEY_ID || ''
  private secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || ''
  private endpoint = process.env.DYNAMODB_ENDPOINT
}
```

## Testing Standards

### Jest Configuration
- **Preset**: ts-jest for TypeScript support
- **Test Environment**: Node.js
- **Test Location**: Colocate tests with source files
- **Test Patterns**: `**/*.test.ts` or `**/*.spec.ts`
- **Coverage**: Collect from all `src/**/*.ts` files

### Test File Naming
Place test files alongside source files:
```
src/services/
  ├── MailSender.ts
  ├── MailSender.test.ts
  ├── SendMailService.ts
  └── SendMailService.test.ts
```

## Express.js Patterns

### Route Definition
Define routes in separate routes.ts file:
```typescript
import express from 'express'
import SendMailController from './controllers/SendMailController'

const routes = express.Router()
routes.get('/emails', SendMailController.list)
routes.post('/send-email', SendMailController.handle)

export default routes
```

### Server Setup
Standard Express server initialization pattern:
```typescript
import express from 'express'
import dotenv from 'dotenv'
import routes from './routes'

dotenv.config()

const app = express()
app.use(express.json())
app.use(routes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}! 🚀`)
})
```

### Middleware Order
1. dotenv.config() - Load environment variables first
2. express.json() - Parse JSON request bodies
3. routes - Application routes

## Data Persistence Patterns

### ID Generation
Generate unique IDs using timestamp + random string:
```typescript
id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

### Timestamp Storage
Store timestamps as ISO strings:
```typescript
createdAt: new Date().toISOString()
```

### Null Coalescing for Optional Fields
Use nullish coalescing operator for optional fields:
```typescript
text: email.text ?? ''
```

### Table Auto-Creation
Implement automatic table creation if not exists:
```typescript
private static async ensureTableExists(): Promise<void> {
  try {
    await this.client!.send(new DescribeTableCommand({ TableName: this.config.getTableName() }))
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      await this.createTable()
    }
  }
}
```

## Caching Patterns

### In-Memory Cache with TTL
Implement time-based cache expiration:
```typescript
export default class SendMailService {
  private static cache: Map<string, EmailCache> = new Map()
  private static readonly CACHE_TTL = 5 * 60 * 1000
  
  private isDuplicate(key: string): boolean {
    const cached = SendMailService.cache.get(key)
    if (!cached) return false
    
    const now = Date.now()
    if (now - cached.timestamp > SendMailService.CACHE_TTL) {
      SendMailService.cache.delete(key)
      return false
    }
    return true
  }
}
```

### Cache Key Generation
Create composite keys from multiple fields:
```typescript
private getEmailKey(data: SendMailRequest): string {
  const from = typeof data.from === 'string' ? data.from : data.from.address
  const to = typeof data.to === 'string' ? data.to : data.to.address
  return `${from}|${to}|${data.subject}`
}
```

## Environment Configuration

### dotenv Usage
Load environment variables at application startup:
```typescript
import dotenv from 'dotenv'
dotenv.config()
```

### Environment Variable Access
Provide defaults for optional configuration:
```typescript
const PORT = process.env.PORT || 3000
private region = process.env.AWS_REGION || 'us-east-1'
```

### Required Configuration Validation
Throw errors for missing required configuration:
```typescript
if (!this.accessKeyId) throw new Error('AWS_ACCESS_KEY_ID is required.')
if (!this.secretAccessKey) throw new Error('AWS_SECRET_ACCESS_KEY is required.')
```

## Nodemailer Integration

### Transport Configuration
Configure SMTP transport from environment variables:
```typescript
private getMailServerConfig() {
  return {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: Number(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  }
}
```

### Mail Options Structure
Separate HTML and plain text content:
```typescript
private getMailOptions(): Mail.Options {
  return {
    from: this.from,
    to: this.to,
    subject: this.subject,
    text: this.text,
    html: this.message
  }
}
```

## Type Definitions

### Request Type Definitions
Define types for service method parameters:
```typescript
type SendMailRequest = {
  from: Address
  to: Address
  subject: string
  message: string
  text?: string
}
```

### Use Nodemailer Types
Import and use Nodemailer's Address type:
```typescript
import { Address } from 'nodemailer/lib/mailer'
```

## Idempotency Implementation

### Idempotency Key Header
Support optional `Idempotency-Key` header for client-controlled deduplication:
```typescript
const idempotencyKey = request.headers['idempotency-key']
if (idempotencyKey) {
  const exists = await checkIdempotencyKey(idempotencyKey)
  if (exists) {
    return response.status(200).json({ status: 'already_processed' })
  }
}
```

### Payload Hash Generation
Generate deterministic hash from email content:
```typescript
import crypto from 'crypto'

private generatePayloadHash(data: SendMailRequest): string {
  const from = typeof data.from === 'string' ? data.from : data.from.address
  const to = typeof data.to === 'string' ? data.to : data.to.address
  const content = `${from}|${to}|${data.subject}|${data.message}`
  return crypto.createHash('sha256').update(content).digest('hex')
}
```

### DynamoDB Conditional Writes
Prevent race conditions with conditional expressions:
```typescript
const params = new PutCommand({
  TableName: DynamoDB.getTableName(),
  Item: emailRecord,
  ConditionExpression: 'attribute_not_exists(id)'
})

try {
  await dynamoDB.send(params)
} catch (error: any) {
  if (error.name === 'ConditionalCheckFailedException') {
    return { status: 'duplicate', message: 'Email already processed' }
  }
  throw error
}
```

### Redis-Based Idempotency (Recommended)
Use Redis for distributed idempotency tracking:
```typescript
import Redis from 'ioredis'

private async checkIdempotency(key: string): Promise<boolean> {
  const redis = await Redis.getInstance()
  const exists = await redis.set(key, '1', 'EX', 300, 'NX')
  return exists === null // null means key already exists
}
```

## Concurrency Control

### Logical Locks
Implement distributed locks for critical sections:
```typescript
private async acquireLock(resourceId: string, ttl: number): Promise<boolean> {
  const redis = await Redis.getInstance()
  const lockKey = `lock:${resourceId}`
  const acquired = await redis.set(lockKey, Date.now(), 'EX', ttl, 'NX')
  return acquired !== null
}

private async releaseLock(resourceId: string): Promise<void> {
  const redis = await Redis.getInstance()
  await redis.del(`lock:${resourceId}`)
}
```

### Optimistic Locking with Version
Use version fields for optimistic concurrency:
```typescript
const params = new UpdateCommand({
  TableName: DynamoDB.getTableName(),
  Key: { id: emailId },
  UpdateExpression: 'SET #status = :newStatus, #version = :newVersion',
  ConditionExpression: '#version = :currentVersion',
  ExpressionAttributeNames: {
    '#status': 'status',
    '#version': 'version'
  },
  ExpressionAttributeValues: {
    ':newStatus': 'sent',
    ':newVersion': currentVersion + 1,
    ':currentVersion': currentVersion
  }
})
```

## Message Queue Integration

### SQS Producer Pattern
Queue emails for asynchronous processing:
```typescript
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

export class EmailQueueService {
  private sqsClient: SQSClient
  private queueUrl: string

  async enqueue(emailData: SendMailRequest): Promise<string> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(emailData),
      MessageAttributes: {
        'CorrelationId': {
          DataType: 'String',
          StringValue: generateCorrelationId()
        }
      }
    })
    
    const result = await this.sqsClient.send(command)
    return result.MessageId!
  }
}
```

### Controller Response for Queued Processing
Return 202 Accepted for asynchronous operations:
```typescript
public static async handle(request: Request, response: Response): Promise<Response> {
  const { from, to, subject, message, text } = request.body
  const idempotencyKey = request.headers['idempotency-key'] as string
  
  const queueService = new EmailQueueService()
  const messageId = await queueService.enqueue({ from, to, subject, message, text })
  
  return response.status(202).json({
    status: 'queued',
    messageId,
    idempotencyKey
  })
}
```

### Worker Consumer Pattern
Process messages from queue:
```typescript
export class EmailWorker {
  async processMessages(): Promise<void> {
    while (true) {
      const messages = await this.receiveMessages()
      
      for (const message of messages) {
        try {
          await this.processMessage(message)
          await this.deleteMessage(message)
        } catch (error) {
          await this.handleFailure(message, error)
        }
      }
    }
  }
}
```

## Performance Optimization

### SMTP Connection Pooling
Reuse SMTP connections for better performance:
```typescript
private getMailServerConfig() {
  return {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: Number(process.env.MAIL_PORT) === 465,
    pool: true,
    maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS) || 5,
    maxMessages: 100,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  }
}
```

### DynamoDB Batch Operations
Batch writes for higher throughput:
```typescript
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb'

async batchSave(emails: Email[]): Promise<void> {
  const chunks = this.chunkArray(emails, 25) // DynamoDB limit
  
  for (const chunk of chunks) {
    const params = new BatchWriteCommand({
      RequestItems: {
        [DynamoDB.getTableName()]: chunk.map(email => ({
          PutRequest: { Item: this.toItem(email) }
        }))
      }
    })
    
    await dynamoDB.send(params)
  }
}
```

### Backpressure Control
Limit concurrent operations:
```typescript
import pLimit from 'p-limit'

const limit = pLimit(10) // Max 10 concurrent operations

const promises = emails.map(email => 
  limit(() => this.sendEmail(email))
)

await Promise.all(promises)
```

## Resilience Patterns

### Circuit Breaker
Prevent cascade failures:
```typescript
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
}
```

### Retry with Exponential Backoff
Handle transient failures:
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) throw error
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}
```

### Timeout Management
Prevent hanging operations:
```typescript
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
  )
  return Promise.race([promise, timeout])
}
```

## Observability

### Structured Logging with Correlation ID
Use Pino for high-performance logging:
```typescript
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  }
})

export function logWithContext(correlationId: string, message: string, data?: any) {
  logger.info({ correlationId, ...data }, message)
}
```

### Prometheus Metrics
Expose metrics for monitoring:
```typescript
import { Counter, Histogram, Gauge, register } from 'prom-client'

export const emailsSentCounter = new Counter({
  name: 'emails_sent_total',
  help: 'Total number of emails sent'
})

export const emailDurationHistogram = new Histogram({
  name: 'email_send_duration_seconds',
  help: 'Email send duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5]
})

export const queueDepthGauge = new Gauge({
  name: 'email_queue_depth',
  help: 'Current email queue depth'
})

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})
```

### Health Check Endpoints
Implement liveness and readiness probes:
```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/ready', async (req, res) => {
  try {
    await checkDynamoDBConnection()
    await checkRedisConnection()
    await checkSMTPConnection()
    res.json({ status: 'ready' })
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: error.message })
  }
})
```

## Testing Standards (Enhanced)

### Load Testing with k6
Validate performance under load:
```javascript
import http from 'k6/http'
import { check } from 'k6'

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 1000 },
    { duration: '2m', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'],
    http_req_failed: ['rate<0.01']
  }
}

export default function() {
  const payload = JSON.stringify({
    from: 'test@example.com',
    to: 'recipient@example.com',
    subject: 'Load Test',
    message: '<p>Test</p>'
  })
  
  const res = http.post('http://localhost:3333/send-email', payload, {
    headers: { 'Content-Type': 'application/json' }
  })
  
  check(res, {
    'status is 202': (r) => r.status === 202
  })
}
```

### Integration Tests with Testcontainers
Test with real dependencies:
```typescript
import { GenericContainer } from 'testcontainers'

describe('Email Integration Tests', () => {
  let dynamoContainer: StartedTestContainer
  let redisContainer: StartedTestContainer
  
  beforeAll(async () => {
    dynamoContainer = await new GenericContainer('amazon/dynamodb-local')
      .withExposedPorts(8000)
      .start()
    
    redisContainer = await new GenericContainer('redis:alpine')
      .withExposedPorts(6379)
      .start()
  })
  
  afterAll(async () => {
    await dynamoContainer.stop()
    await redisContainer.stop()
  })
})
```

### Idempotency Tests
Validate exactly-once semantics:
```typescript
describe('Idempotency', () => {
  it('should not send duplicate emails within TTL window', async () => {
    const emailData = { from: 'test@example.com', to: 'user@example.com', subject: 'Test', message: 'Test' }
    
    const result1 = await service.execute(emailData)
    const result2 = await service.execute(emailData)
    
    expect(result1.status).toBe('sent')
    expect(result2.status).toBe('duplicate')
  })
  
  it('should handle concurrent requests safely', async () => {
    const emailData = { from: 'test@example.com', to: 'user@example.com', subject: 'Test', message: 'Test' }
    
    const results = await Promise.all([
      service.execute(emailData),
      service.execute(emailData),
      service.execute(emailData)
    ])
    
    const sentCount = results.filter(r => r.status === 'sent').length
    expect(sentCount).toBe(1)
  })
})
```

## Best Practices Summary

1. **Separation of Concerns**: Keep controllers thin, services focused, repositories simple
2. **Type Safety**: Leverage TypeScript strict mode for compile-time safety
3. **Error Handling**: Return structured errors, don't throw in services
4. **Async/Await**: Use async/await consistently for asynchronous operations
5. **Environment Config**: Never hardcode credentials or configuration
6. **Singleton Connections**: Reuse database connections via singleton pattern
7. **Distributed Caching**: Use Redis for idempotency keys and rate limiting
8. **Validation**: Validate inputs early in the request flow
9. **Testing**: 80%+ coverage with 100% for critical paths
10. **AWS SDK v3**: Use command pattern for all AWS service interactions
11. **Idempotency**: Implement multiple strategies (header, hash, conditional writes)
12. **Concurrency**: Use locks and optimistic locking for safe concurrent operations
13. **Message Queues**: Decouple processing with SQS/Kafka for resilience
14. **Performance**: Connection pooling, batch operations, backpressure control
15. **Resilience**: Circuit breakers, retries with backoff, timeout management
16. **Observability**: Structured logging, Prometheus metrics, health checks
17. **Load Testing**: Validate performance targets with k6/Artillery
18. **Horizontal Scaling**: Stateless design for load balancer distribution
