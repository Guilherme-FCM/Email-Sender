# Email-Sender Product Overview

## Purpose
Email-Sender is a production-grade Node.js REST API service designed for **high-scale transactional email delivery**, capable of handling thousands of requests per second with reliability, idempotency, and strict concurrency control.

The architecture is oriented toward **performance, resilience, and horizontal scalability**, with DynamoDB persistence and support for asynchronous message processing.

## High-Performance Architecture

The service is designed to operate under high load with:

- **Asynchronous non-blocking processing** (optimized event loop)
- **Horizontal scalability** (stateless + containerization)
- **SMTP connection pooling**
- **DynamoDB batch writes**
- **Optional message queuing** (SQS/Kafka)
- **Strategic caching** (Redis or DynamoDB TTL)

### Applied Strategies:
- Stateless API (scales via load balancer)
- Backpressure control
- Timeout & retry policies
- Circuit breaker pattern
- Health checks and readiness probes
- Efficient DynamoDB indexes
- TTL for automatic cleanup of temporary records

**Target capacity**: Thousands of requests per second with low latency.

## Key Features

### Automatic Idempotency
- **Zero-configuration idempotency**: Automatically prevents duplicate emails without requiring client headers or keys
- **Content-based deduplication**: Uses SHA-256 hash of `from + to + subject` to identify duplicates
- **Smart duplicate detection**: Message content excluded from hash to allow corrections with same subject
- **5-minute TTL window**: Duplicate requests within 5 minutes return cached response
- **Transactional control**: DynamoDB conditional writes prevent race conditions
- **Exactly-once semantics**: Guarantees single email delivery for identical requests

**How it works:**
```
Request 1: from=sender@example.com, to=recipient@example.com, subject="Welcome"
→ Hash: abc123... → Email sent ✅

Request 2: from=sender@example.com, to=recipient@example.com, subject="Welcome"
→ Hash: abc123... → Duplicate detected, cached response returned ⚠️

Request 3: from=sender@example.com, to=recipient@example.com, subject="Reminder"
→ Hash: def456... → Different subject, email sent ✅
```

**Benefits:**
- ✅ No accidental duplicate emails
- ✅ Safe retries on network failures
- ✅ Consistent responses for identical requests
- ✅ Zero client configuration required
- ✅ Transparent operation

### Idempotency Guarantees (Advanced)
- **Robust idempotency** preventing duplicate sends under retry, timeout, or concurrent scenarios
- **Optional Idempotency-Key header** support for explicit client control (future enhancement)
- **Deterministic payload hashing** (from + to + subject)
- **Transactional control** via DynamoDB conditional writes
- **Exactly-once send semantic** within configurable time window

### Concurrency & Ordering
- Safe handling of high concurrent requests
- No duplicate sends under race conditions
- Logical locks via DynamoDB conditional expressions
- Order control when needed (by logical key, e.g., userId)
- Partitioning support by key

### Email Sending Capabilities
- **REST API**: POST `/send-email` with 202 Accepted response for queued processing
- **Flexible Recipients**: Single or multiple recipients (array)
- **HTML & Plain Text**: Rich HTML emails with optional plain text fallback
- **Duplicate Prevention**: Hash-based and key-based deduplication
- **Email Persistence**: All emails stored in DynamoDB with TTL support

### Message Queue Architecture (Recommended)
Client → REST API → Queue (SQS/Kafka) → Worker → SMTP → DynamoDB

**Benefits**:
- Decoupling between reception and sending
- Peak load absorption
- Automatic retry with Dead Letter Queue (DLQ)
- Resilient processing
- Delivery guarantees
- Order guarantee per partition key (Kafka) or FIFO queue (SQS)

### Observability
- Structured logging with correlation IDs
- Metrics (Prometheus/CloudWatch)
- Dashboards for:
  - Emails sent
  - Blocked duplicates
  - Failures
  - Average send time
  - Queue size

### Development & Testing
- **Comprehensive test coverage**: Unit, feature, integration, and load tests
- **80%+ code coverage** (100% for critical paths)
- **Load testing** with k6/Artillery
- **Mailtrap Integration**: Email sandbox for development
- **Docker Support**: Local DynamoDB and message queue
- **Hot Reload**: Development mode with automatic restart

## Target Users

### High-Volume Systems
- **SaaS Platforms**: Multi-tenant applications requiring reliable email delivery
- **Fintechs**: Transaction notifications and alerts
- **E-commerce**: Order confirmations, shipping updates
- **Critical Notification Systems**: Time-sensitive alerts

### Enterprise Development Teams
Teams requiring:
- Production-grade reliability
- Horizontal scalability
- Idempotent operations
- Event-driven architecture
- High concurrency support
- Comprehensive observability

## Use Cases

1. **High-Volume Transactional Emails**: Order confirmations, receipts, account notifications at scale
2. **Critical User Notifications**: Password resets, security alerts, verification codes
3. **Real-Time System Alerts**: Infrastructure monitoring, error notifications
4. **Bulk Campaign Delivery**: Marketing campaigns with guaranteed delivery
5. **Multi-Tenant SaaS**: Isolated email delivery per tenant with rate limiting
6. **Event-Driven Workflows**: Email triggers from business events via message queues

## Product Positioning

Email-Sender is not just an email API — it's a:
- **Resilient service** with circuit breakers and retry logic
- **Idempotent system** with exactly-once semantics
- **Horizontally scalable** stateless architecture
- **High-concurrency ready** with proper locking mechanisms
- **Event-driven** with message queue integration
- **Production-grade** with comprehensive observability
