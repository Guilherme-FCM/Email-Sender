# Email-Sender MVP Implementation Tasks

## Project Status
- **Current State**: Basic email sending functionality
- **Target**: Production-grade high-performance email service
- **Performance Goals**: Thousands of RPS, P95 < 100ms, P99 < 200ms, 99.9% uptime

---

## Critical Path Tasks (Priority 1)

### 1. Idempotency Implementation
- [x] Implement automatic idempotency key generation from email content (from, to, subject)
- [x] Implement payload hash generation using crypto (SHA-256)
- [x] Add in-memory cache with TTL for duplicate detection
- [x] Store idempotency key in DynamoDB for audit trail
- [x] Add idempotency tests (100% coverage required)
- [ ] Document idempotency behavior in API docs

**Acceptance Criteria:**
- Duplicate requests within TTL window return cached response ✅
- Idempotency key automatically generated from email content ✅
- In-memory cache provides fast duplicate detection ✅

---

### 2. Redis Integration for Distributed Caching
- [x] Add `ioredis` dependency to package.json
- [x] Create `src/database/RedisConnection.ts` singleton class
- [x] Replace in-memory cache with Redis in SendMailService
- [x] Implement TTL-based idempotency key storage (5 min default)
- [x] Add Redis health check endpoint
- [x] Update docker-compose.yml with Redis service
- [x] Add Redis configuration to .env.example

**Acceptance Criteria:**
- Redis connection pooling configured ✅
- Cache survives application restarts ✅
- TTL automatically expires old keys ✅
- Health check validates Redis connectivity ✅

---

### 3. Message Queue Architecture (SQS)
- [x] Add `@aws-sdk/client-sqs` dependency
- [x] Create `src/services/EmailQueueService.ts` for enqueueing
- [x] Update SendMailController to return 202 Accepted
- [x] Create `src/workers/EmailWorker.ts` for queue processing
- [x] Implement Dead Letter Queue (DLQ) handling
- [x] Add correlation ID tracking (X-Correlation-ID header)
- [x] Update docker-compose.yml with LocalStack for SQS testing
- [x] Add SQS configuration to .env.example

**Acceptance Criteria:**
- API returns 202 Accepted with messageId
- Messages queued successfully to SQS
- Worker processes messages asynchronously
- Failed messages move to DLQ after retries
- Correlation IDs tracked across async flow

---

### 4. Concurrency Control
- [x] Implement distributed locks using Redis (SET NX EX)
- [x] Add optimistic locking with version fields in DynamoDB
- [x] Create `src/utils/Lock.ts` utility class
- [x] Add concurrency tests (race condition scenarios)
- [x] Add backpressure control with `p-limit` dependency
- [x] Document concurrency guarantees

**Acceptance Criteria:**
- Concurrent requests for same resource properly serialized ✅
- Version conflicts detected and handled ✅
- Lock acquisition/release working correctly ✅
- Race condition tests pass 100% ✅

---

## High Priority Tasks (Priority 2)

### 5. Performance Optimizations
- [ ] Enable SMTP connection pooling in MailSender (pool: true)
- [ ] Configure maxConnections and maxMessages for SMTP
- [ ] Implement DynamoDB batch write operations
- [ ] Create `src/repositories/EmailRepository.batchSave()` method
- [ ] Add request timeout management utility
- [ ] Configure max concurrent connections via environment
- [ ] Add SMTP_MAX_CONNECTIONS to .env.example

**Acceptance Criteria:**
- SMTP connections reused across requests
- Batch writes reduce DynamoDB API calls
- Timeouts prevent hanging operations
- Performance improvement measurable in load tests

---

### 6. Observability & Monitoring
- [ ] Add `pino` dependency for structured logging
- [ ] Create `src/utils/logger.ts` with correlation ID support
- [ ] Replace console.log with structured logging
- [ ] Add `prom-client` dependency for Prometheus metrics
- [ ] Create `src/metrics/metrics.ts` with counters/histograms
- [ ] Implement `/metrics` endpoint in routes
- [ ] Create `/health` endpoint (liveness probe)
- [ ] Create `/ready` endpoint (readiness probe with dependency checks)
- [ ] Add LOG_LEVEL and METRICS_PORT to .env.example

**Metrics to Track:**
- emails_sent_total (counter)
- emails_duplicate_blocked_total (counter)
- email_send_duration_seconds (histogram)
- email_queue_depth (gauge)
- http_request_duration_seconds (histogram)

**Acceptance Criteria:**
- All logs include correlation IDs
- Metrics endpoint returns Prometheus format
- Health checks validate all dependencies
- Logs structured as JSON for parsing

---

### 7. Resilience Patterns
- [ ] Create `src/utils/CircuitBreaker.ts` class
- [ ] Implement retry logic with exponential backoff utility
- [ ] Create `src/utils/retry.ts` with jitter
- [ ] Create timeout wrapper utility `src/utils/timeout.ts`
- [ ] Add circuit breaker to SMTP operations
- [ ] Add retry logic to DynamoDB operations
- [ ] Add CIRCUIT_BREAKER_THRESHOLD to .env.example
- [ ] Document resilience behavior

**Acceptance Criteria:**
- Circuit breaker opens after threshold failures
- Retries use exponential backoff with jitter
- Operations timeout after configured duration
- Transient failures handled gracefully

---

## Testing Requirements (Priority 3)

### 8. Comprehensive Test Suite
- [x] Write unit tests for SendMailService (target: 90%+ coverage)
- [x] Write unit tests for MailSender
- [x] Write unit tests for EmailRepository
- [x] Write unit tests for CircuitBreaker
- [x] Write unit tests for retry logic
- [x] Add `testcontainers` dependency
- [x] Create integration tests with DynamoDB Local
- [x] Create integration tests with Redis
- [x] Create idempotency tests (concurrent requests)
- [x] Create concurrency tests (race conditions, locks)
- [x] Create feature tests for complete HTTP flows
- [x] Update jest.config.js with coverage thresholds

**Coverage Targets:**
- Overall: 80%+ ✅ (88.88% lines)
- Critical paths (idempotency, concurrency): 100% ✅
- Services: 90%+ ✅ (98.36% lines)
- Repositories: 85%+ ✅ (100% lines)

**Acceptance Criteria:**
- All tests pass consistently ✅
- Coverage thresholds met ✅
- Integration tests use real dependencies (containerized) ✅
- Idempotency tests validate exactly-once semantics ✅

---

### 9. Load Testing Infrastructure
- [ ] Install k6 for load testing
- [ ] Create `tests/load/send-email.js` k6 script
- [ ] Define performance thresholds in k6 script
- [ ] Create load testing scenarios (ramp-up, sustained, spike)
- [ ] Add npm script: `npm run test:load`
- [ ] Document load testing procedures
- [ ] Create performance baseline report

**Load Test Scenarios:**
1. Ramp-up: 0 → 1000 users over 2 minutes
2. Sustained: 1000 users for 5 minutes
3. Spike: 0 → 2000 users instantly
4. Stress: Increase until failure

**Acceptance Criteria:**
- P95 latency < 100ms under 1000 RPS
- P99 latency < 200ms under 1000 RPS
- Error rate < 1% under normal load
- System handles 2000+ RPS without crashes

---

## Infrastructure & DevOps (Priority 4)

### 10. Docker & Deployment
- [ ] Update docker-compose.yml with Redis service
- [ ] Add LocalStack service for SQS testing
- [ ] Create multi-stage Dockerfile for production
- [ ] Configure health checks in docker-compose.yml
- [ ] Add non-root user in Dockerfile for security
- [ ] Create .dockerignore file
- [ ] Add docker build script to package.json
- [ ] Document Docker deployment process

**Acceptance Criteria:**
- All services start with docker-compose up
- Production Dockerfile optimized for size
- Health checks working in Docker
- Non-root user configured properly

---

### 11. Environment Configuration
- [ ] Update .env.example with Redis variables
- [ ] Add SQS queue URL configuration
- [ ] Add performance tuning variables
- [ ] Add observability configuration
- [ ] Add idempotency TTL configuration
- [ ] Add circuit breaker configuration
- [ ] Add timeout configuration
- [ ] Document all environment variables

**Required Variables:**
```
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# SQS
SQS_QUEUE_URL=
SQS_DLQ_URL=

# Performance
SMTP_MAX_CONNECTIONS=5
MAX_BATCH_SIZE=25
REQUEST_TIMEOUT=30000

# Idempotency
IDEMPOTENCY_TTL=300000

# Resilience
CIRCUIT_BREAKER_THRESHOLD=5
MAX_RETRIES=3
RETRY_BASE_DELAY=1000

# Observability
LOG_LEVEL=info
METRICS_PORT=9090
```

---

### 12. DynamoDB Enhancements
- [ ] Add version field to Email entity for optimistic locking
- [ ] Create GSI for querying by sender email
- [ ] Create GSI for querying by timestamp
- [ ] Implement TTL attribute for automatic cleanup
- [ ] Update EmailRepository with conditional writes
- [ ] Add DynamoDB indexes to table creation
- [ ] Document DynamoDB schema and indexes

**Acceptance Criteria:**
- Version field increments on updates
- GSIs enable efficient queries
- TTL automatically removes old records
- Conditional writes prevent race conditions

---

## Documentation (Priority 5)

### 13. API Documentation
- [ ] Document Idempotency-Key header usage
- [ ] Document X-Correlation-ID header
- [ ] Update response format (202 Accepted)
- [ ] Add error response examples
- [ ] Document rate limiting behavior
- [ ] Create OpenAPI/Swagger specification
- [ ] Add request/response examples
- [ ] Document authentication (if added)

**Acceptance Criteria:**
- All endpoints documented
- Headers explained with examples
- Error codes documented
- OpenAPI spec validates

---

### 14. Operational Documentation
- [ ] Create DEPLOYMENT.md guide
- [ ] Document monitoring and alerting setup
- [ ] Create TROUBLESHOOTING.md guide
- [ ] Document scaling strategies
- [ ] Create runbook for common issues
- [ ] Document backup and recovery procedures
- [ ] Add architecture diagrams
- [ ] Document performance tuning guide

**Acceptance Criteria:**
- Deployment guide enables zero-downtime deploys
- Troubleshooting guide covers common issues
- Runbook provides step-by-step procedures
- Architecture diagrams show system flow

---

## Implementation Phases

### Phase 1 - Foundation (Week 1)
**Goal:** Distributed caching and idempotency
- Task 2: Redis integration
- Task 1: Idempotency implementation
- Task 6: Basic observability (logging, health checks)

**Deliverables:**
- Redis-backed caching working
- Idempotency preventing duplicates
- Structured logging with correlation IDs
- Health check endpoints

---

### Phase 2 - Scalability (Week 2)
**Goal:** Asynchronous processing and performance
- Task 3: Message queue (SQS) integration
- Task 4: Concurrency control
- Task 5: Performance optimizations

**Deliverables:**
- Async email processing via SQS
- Distributed locks preventing race conditions
- SMTP connection pooling
- DynamoDB batch operations

---

### Phase 3 - Reliability (Week 3)
**Goal:** Resilience and comprehensive testing
- Task 7: Resilience patterns
- Task 8: Comprehensive testing
- Task 9: Load testing

**Deliverables:**
- Circuit breaker and retry logic
- 80%+ test coverage
- 100% coverage for critical paths
- Load tests validating performance targets

---

### Phase 4 - Production Ready (Week 4)
**Goal:** Monitoring, deployment, and documentation
- Task 6: Complete observability (metrics)
- Task 10-12: Infrastructure improvements
- Task 13-14: Documentation

**Deliverables:**
- Prometheus metrics exposed
- Production-ready Docker setup
- Complete API documentation
- Operational runbooks

---

## Success Metrics

### Performance
- ✅ Throughput: 2000+ requests per second
- ✅ P95 latency: < 100ms
- ✅ P99 latency: < 200ms
- ✅ Error rate: < 1% under normal load

### Reliability
- ✅ Uptime: 99.9%
- ✅ Idempotency: 100% duplicate prevention
- ✅ Concurrency: Zero race conditions
- ✅ Data consistency: 100%

### Quality
- ✅ Test coverage: 80%+ overall
- ✅ Critical path coverage: 100%
- ✅ Load tests: All scenarios pass
- ✅ Code quality: TypeScript strict mode

### Observability
- ✅ Structured logging: All requests
- ✅ Metrics: All key operations
- ✅ Health checks: All dependencies
- ✅ Correlation IDs: End-to-end tracing

---

## Notes
- Update this file as tasks are completed
- Mark completed tasks with [x]
- Add blockers or issues in comments
- Review progress weekly
- Adjust priorities based on feedback
