# Email-Sender Technology Stack

## Programming Languages

### TypeScript 4.7.4
- **Target**: ES2016
- **Module System**: CommonJS
- **Strict Mode**: Enabled for type safety
- **JSON Module Support**: Enabled for configuration files
- **ES Module Interop**: Enabled for better CommonJS compatibility

## Core Dependencies

### Runtime Dependencies
- **express** (^4.18.1): Web framework for REST API (consider Fastify for higher performance)
- **nodemailer** (^6.7.6): Email sending library with SMTP connection pooling support
- **@aws-sdk/client-dynamodb** (^3.991.0): AWS DynamoDB client
- **@aws-sdk/lib-dynamodb** (^3.991.0): DynamoDB document client for simplified operations
- **dotenv** (^17.2.3): Environment variable management

### Recommended Additional Dependencies
- **ioredis**: Redis client for distributed caching and idempotency keys
- **@aws-sdk/client-sqs**: AWS SQS client for message queue integration
- **pino**: High-performance structured logging with correlation ID support
- **@opentelemetry/api**: Observability and distributed tracing
- **prom-client**: Prometheus metrics collection

### Development Dependencies
- **typescript** (^4.7.4): TypeScript compiler
- **ts-node-dev** (^2.0.0): Development server with hot reload
- **jest** (^29.5.0): Testing framework
- **ts-jest** (^29.1.0): TypeScript preprocessor for Jest
- **@types/express** (^4.17.13): TypeScript definitions for Express
- **@types/nodemailer** (^6.4.4): TypeScript definitions for Nodemailer
- **@types/jest** (^29.5.0): TypeScript definitions for Jest

### Recommended Testing Tools
- **k6** or **artillery**: Load and stress testing
- **supertest**: HTTP integration testing
- **testcontainers**: Docker containers for integration tests

## Build System & Tools

### Package Manager
- **npm**: Node Package Manager for dependency management

### Build Commands
```bash
npm run build          # Compile TypeScript to JavaScript
npm run dev            # Start development server with hot reload
npm test               # Run Jest test suite
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate test coverage report (target: 80%+)
npm run test:load      # Run load tests with k6/artillery
npm run test:integration # Run integration tests with Docker containers
```

### TypeScript Compiler Configuration
- **Transpile Only Mode**: Enabled in development for faster rebuilds
- **Poll Mode**: File watching with polling for compatibility
- **Respawn**: Automatic restart on file changes

## High-Performance Architecture

### Performance Optimizations
- **Event Loop Optimization**: Non-blocking async operations
- **Connection Pooling**: SMTP connection reuse
- **Batch Operations**: DynamoDB batch writes for efficiency
- **Caching Strategy**: Redis for idempotency keys and rate limiting
- **Horizontal Scaling**: Stateless design for load balancer distribution

### Concurrency & Resilience
- **Backpressure Control**: Request queue management
- **Circuit Breaker**: Prevent cascade failures
- **Retry Policies**: Exponential backoff with jitter
- **Timeout Management**: Request and operation timeouts
- **Health Checks**: Liveness and readiness probes

## Testing Infrastructure

### Jest Configuration
- **Preset**: ts-jest for TypeScript support
- **Test Environment**: Node.js
- **Test Pattern**: `**/*.test.ts` files
- **Coverage Target**: 80%+ overall, 100% for critical paths (idempotency, concurrency)
- **Watch Mode**: Interactive test running during development

### Test Types
1. **Unit Tests**: Services, validators, hash generators, retry logic
2. **Feature Tests**: Complete HTTP endpoint flows
3. **Integration Tests**: DynamoDB Local, SMTP sandbox, message queues
4. **Load Tests**: Throughput, latency, memory consumption under stress

### Load Testing Metrics
- Requests per second (target: thousands)
- P95/P99 latency
- Error rate under load
- Memory and CPU usage
- Queue depth and processing time

## Infrastructure & Deployment

### Docker
**Dockerfile**: Multi-stage build for production
- Base image: Node.js (Alpine for smaller size)
- Dependency installation
- TypeScript compilation
- Production runtime with non-root user

**docker-compose.yml**: Local development environment
- **app service**: Application container with volume mounting
- **dynamodb service**: DynamoDB Local on port 8000
- **redis service**: Redis for caching and idempotency (recommended)
- **localstack service**: Local AWS services (SQS) for testing
- **Port mapping**: Application on port 3333 (configurable)
- **Volume mounting**: Source code sync for hot reload

### Database
**AWS DynamoDB**
- NoSQL document database with single-digit millisecond latency
- Local development via DynamoDB Local Docker image
- Document client for simplified CRUD operations
- Configurable endpoint via environment variables
- **Indexes**: GSI for efficient queries
- **TTL**: Automatic cleanup of temporary records
- **Conditional Writes**: Idempotency and concurrency control
- **Batch Operations**: High-throughput writes

### Caching Layer
**Redis** (Recommended)
- Distributed idempotency key storage
- Rate limiting counters
- Session management
- Cache with TTL support

### Message Queue
**AWS SQS** or **Apache Kafka**
- Decoupled asynchronous processing
- Peak load absorption
- Automatic retry with Dead Letter Queue
- Order guarantee (FIFO queue or partition key)
- Backpressure management

### Email Service
**Mailtrap** (Development)
- Email sandbox for testing
- SMTP configuration via config/mail.json
- Prevents accidental email sending in development

**Nodemailer** (Production)
- SMTP connection pooling for performance
- Multiple provider support
- HTML and plain text email support
- Configurable transport options
- Retry logic for transient failures

## Environment Configuration

### Required Environment Variables
```
# Application
PORT=3333                          # Server port
NODE_ENV=production                # Environment mode

# DynamoDB
AWS_REGION=us-east-1              # AWS region
AWS_ACCESS_KEY_ID=<key>           # AWS credentials
AWS_SECRET_ACCESS_KEY=<secret>    # AWS credentials
DYNAMODB_ENDPOINT=<url>           # DynamoDB endpoint (local or AWS)
DYNAMODB_PORT=8000                # DynamoDB Local port
DYNAMODB_TABLE_NAME=Emails        # Table name

# Redis (Recommended)
REDIS_HOST=localhost              # Redis host
REDIS_PORT=6379                   # Redis port
REDIS_PASSWORD=<password>         # Redis password (if required)

# Message Queue (Optional)
SQS_QUEUE_URL=<url>               # SQS queue URL
KAFKA_BROKERS=<brokers>           # Kafka broker list

# Email
SMTP_HOST=<host>                  # SMTP server
SMTP_PORT=<port>                  # SMTP port
SMTP_USER=<user>                  # SMTP username
SMTP_PASS=<pass>                  # SMTP password
SMTP_POOL=true                    # Enable connection pooling
SMTP_MAX_CONNECTIONS=5            # Max concurrent connections

# Idempotency
IDEMPOTENCY_TTL=300000            # TTL in milliseconds (5 minutes)

# Performance
MAX_BATCH_SIZE=25                 # DynamoDB batch write size
REQUEST_TIMEOUT=30000             # Request timeout in ms
CIRCUIT_BREAKER_THRESHOLD=5       # Failure threshold

# Observability
LOG_LEVEL=info                    # Logging level
METRICS_PORT=9090                 # Prometheus metrics port
```

### Configuration Files
- **.env**: Local environment variables (not committed)
- **.env.example**: Template for required variables
- **config/mail.json**: Mailtrap/SMTP configuration (not committed)

## Development Workflow

### Local Development
1. Install dependencies: `npm install`
2. Configure Mailtrap credentials in `config/mail.json`
3. Set up environment variables in `.env`
4. Start Docker services: `docker-compose up`
5. Run development server: `npm run dev`
6. Access API at `http://localhost:3333`
7. Access metrics at `http://localhost:9090/metrics`

### Testing Workflow
1. Write tests alongside source files (*.test.ts)
2. Run unit tests: `npm test`
3. Watch mode for TDD: `npm run test:watch`
4. Generate coverage: `npm run test:coverage` (target: 80%+)
5. Run integration tests: `npm run test:integration`
6. Run load tests: `npm run test:load`

### Production Build
1. Compile TypeScript: `npm run build`
2. Build Docker image: `docker build -t email-sender .`
3. Deploy container with production environment variables
4. Configure production SMTP, DynamoDB, Redis, and SQS endpoints
5. Set up load balancer for horizontal scaling
6. Configure auto-scaling policies
7. Set up monitoring and alerting

## API Specifications

### REST API
- **Framework**: Express.js (or Fastify for higher performance)
- **Port**: 3333 (default, configurable)
- **Content-Type**: application/json
- **Endpoints**: 
  - POST `/send-email`: Send email (returns 202 Accepted for queued processing)
  - GET `/emails`: List sent emails
  - GET `/health`: Health check endpoint
  - GET `/ready`: Readiness probe
  - GET `/metrics`: Prometheus metrics

### Request/Response Format
- JSON request body with email parameters
- **Idempotency-Key header** (optional but recommended)
- **X-Correlation-ID header** for request tracing
- 202 Accepted response for queued emails
- JSON response with success/error status
- HTTP status codes for error handling

## Observability

### Structured Logging
- **Pino**: High-performance JSON logging
- **Correlation IDs**: Request tracing across services
- **Log Levels**: debug, info, warn, error
- **Contextual Data**: User ID, email ID, timestamps

### Metrics (Prometheus)
- Emails sent counter
- Duplicate emails blocked counter
- Email send duration histogram
- Queue depth gauge
- Error rate counter
- HTTP request duration
- Active connections gauge

### Monitoring Dashboards
- Email throughput
- Success/failure rates
- Latency percentiles (P50, P95, P99)
- Queue processing time
- Resource utilization (CPU, memory)
- Error trends
