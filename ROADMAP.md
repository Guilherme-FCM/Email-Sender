# Roadmap

## Completed

- [x] **Idempotency** — SHA-256 hash-based duplicate detection with 5-minute TTL
- [x] **Redis integration** — distributed cache replacing in-memory store
- [x] **SQS message queue** — async processing with `202 Accepted` response and correlation ID tracing
- [x] **Distributed locking** — Redis `SET NX EX` preventing race conditions on concurrent requests
- [x] **Interface-driven design** — `IEmailSender`, `IEmailRepository`, `ICacheService`, `ILockService` ports
- [x] **Health & readiness probes** — `/health` and `/ready` endpoints
- [x] **Test suite** — 117 tests across all layers

---

## Upcoming

### Performance
- [ ] SMTP connection pooling (`pool: true`, configurable `maxConnections`)
- [ ] DynamoDB batch writes for high-throughput scenarios
- [ ] Request timeout management

### Resilience
- [ ] Circuit breaker for SMTP operations
- [ ] Retry with exponential backoff for DynamoDB and SQS
- [ ] Dead Letter Queue (DLQ) handling in the worker

### Observability
- [ ] Structured logging with `pino` and correlation ID propagation
- [ ] Prometheus metrics (`/metrics` endpoint) — emails sent, duplicates blocked, latency histograms
- [ ] Replace all `console.log` / `console.error` with structured logger

### Testing
- [ ] Integration tests with real Redis and DynamoDB via `testcontainers`
- [ ] Load tests with `k6` — target P95 < 100ms at 1000 RPS

### Documentation
- [ ] OpenAPI / Swagger specification
