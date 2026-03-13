# Redis Integration - Task 2 Implementation

## Overview
Successfully replaced in-memory cache with Redis for distributed idempotency tracking, enabling horizontal scaling and persistent cache across application restarts.

## What Was Implemented

### 1. Redis Connection Singleton (`src/database/RedisConnection.ts`)
- Singleton pattern with lazy initialization
- Connection pooling and retry strategy
- Environment-based configuration
- Health check method for readiness probes
- Automatic reconnection on connection loss
- Event logging for connection lifecycle

### 2. Updated SendMailService (`src/services/SendMailService.ts`)
- Removed static in-memory Map cache
- Integrated Redis for distributed caching
- Async `isDuplicate()` method using Redis GET
- Async `cacheResult()` method using Redis SETEX with TTL
- Graceful error handling with fail-open/fail-closed strategies
- Configurable via `REDIS_REQUIRED` environment variable

### 3. Health Check Controller (`src/controllers/HealthController.ts`)
- `GET /health`: Basic liveness probe
- `GET /ready`: Readiness probe checking Redis and DynamoDB
- Returns 503 if dependencies unavailable
- JSON response with status and timestamp

### 4. Docker Compose Integration
- Added Redis 7 Alpine service
- Persistent volume for data (`redis_data`)
- Health check with `redis-cli ping`
- Automatic restart policy
- Connected to application network

### 5. Environment Configuration
- `REDIS_HOST`: Redis server host (default: localhost)
- `REDIS_PORT`: Redis server port (default: 6379)
- `REDIS_PASSWORD`: Optional authentication
- `REDIS_DB`: Database number (default: 0)
- `REDIS_MAX_RETRIES`: Connection retry attempts (default: 3)
- `REDIS_CONNECT_TIMEOUT`: Connection timeout in ms (default: 10000)
- `REDIS_REQUIRED`: Fail if Redis unavailable (default: true)
- `IDEMPOTENCY_TTL`: Cache TTL in seconds (default: 300)

### 6. Comprehensive Test Suite
- `RedisConnection.test.ts`: Unit tests for singleton, configuration, health checks
- Updated `SendMailService.test.ts`: Mocked Redis for idempotency tests
- Tests for TTL expiration, concurrent requests, error handling

## How It Works

### Idempotency Flow with Redis
1. Request arrives with email data
2. Generate payload hash from `from + to + subject`
3. Check Redis for existing key: `GET <hash>`
4. If found: Return cached result (duplicate detected)
5. If not found: Send email via SMTP
6. Store result in Redis: `SETEX <hash> <TTL> <result>`
7. Save email record to DynamoDB

### Cache Key Format
```
Key: SHA-256 hash of "from|to|subject"
Value: JSON stringified result object
TTL: 300 seconds (5 minutes, configurable)
```

### Error Handling Strategy
- **REDIS_REQUIRED=true** (default): Throw error if Redis unavailable
- **REDIS_REQUIRED=false**: Log warning and proceed without cache (fail-open)

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure Redis:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_REQUIRED=true
IDEMPOTENCY_TTL=300
```

### 3. Start Services with Docker
```bash
docker-compose up
```

This starts:
- Application on port 3333
- DynamoDB Local on port 8000
- Redis on port 6379

### 4. Verify Health
```bash
# Liveness probe
curl http://localhost:3333/health

# Readiness probe
curl http://localhost:3333/ready
```

## Testing

### Run All Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test:coverage
```

### Test Redis Connection
```bash
# Connect to Redis CLI
docker exec -it email-sender-redis-1 redis-cli

# Test commands
PING
SET test-key "test-value"
GET test-key
TTL test-key
DEL test-key
```

## Performance Benefits

### Before (In-Memory Cache)
- ❌ Cache lost on application restart
- ❌ Not shared across multiple instances
- ❌ No persistence
- ✅ Fast access (~0.01ms)

### After (Redis Cache)
- ✅ Cache persists across restarts
- ✅ Shared across all application instances
- ✅ Persistent storage with AOF
- ✅ Fast access (~1ms P99)
- ✅ Horizontal scaling ready
- ✅ TTL automatic expiration

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Load Balancer  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ App 1  │ │ App 2  │  (Multiple instances)
└───┬────┘ └───┬────┘
    │          │
    └────┬─────┘
         ▼
    ┌─────────┐
    │  Redis  │  (Shared cache)
    └─────────┘
         │
         ▼
    ┌──────────┐
    │ DynamoDB │  (Persistent storage)
    └──────────┘
```

## Success Criteria ✅

- ✅ Redis connection established via singleton
- ✅ In-memory cache fully replaced with Redis
- ✅ Idempotency keys persist across application restarts
- ✅ TTL automatically expires old keys (300 seconds)
- ✅ Health check validates Redis connectivity
- ✅ Docker Compose includes Redis service with health check
- ✅ All tests updated and passing
- ✅ Environment configuration documented
- ✅ Graceful error handling implemented

## Next Steps

### Task 3: Message Queue Architecture (SQS)
- Add `@aws-sdk/client-sqs` dependency
- Create `EmailQueueService` for async processing
- Update controller to return 202 Accepted
- Implement worker for queue consumption

### Task 4: Concurrency Control
- Implement distributed locks using Redis SET NX EX
- Add optimistic locking with DynamoDB version fields
- Create lock utility class
- Add race condition tests

## Troubleshooting

### Redis Connection Failed
```bash
# Check Redis is running
docker ps | grep redis

# Check Redis logs
docker logs email-sender-redis-1

# Test connection
docker exec -it email-sender-redis-1 redis-cli ping
```

### Cache Not Working
```bash
# Check environment variables
echo $REDIS_HOST
echo $REDIS_PORT

# Monitor Redis commands
docker exec -it email-sender-redis-1 redis-cli MONITOR
```

### Tests Failing
```bash
# Clear Jest cache
npm test -- --clearCache

# Run specific test file
npm test RedisConnection.test.ts
```

## References
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Redis Commands](https://redis.io/commands)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
