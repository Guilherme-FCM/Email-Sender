# Quick Start Guide - Redis Integration

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Create `.env` file (or copy from `.env.example`):
```env
# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_REQUIRED=true
IDEMPOTENCY_TTL=300

# Other required configs...
PORT=3333
DYNAMODB_ENDPOINT=http://dynamodb:8000
```

### Step 3: Start Services
```bash
docker-compose up
```

## ✅ Verify Installation

### Check Health
```bash
curl http://localhost:3333/health
# Expected: {"status":"ok","timestamp":"..."}

curl http://localhost:3333/ready
# Expected: {"status":"ready","checks":{"redis":true,"dynamodb":true},"timestamp":"..."}
```

### Test Email Sending
```bash
curl -X POST http://localhost:3333/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "subject": "Test Email",
    "message": "<h1>Hello World</h1>"
  }'
```

### Test Idempotency (Send Same Email Twice)
```bash
# First request - email sent
curl -X POST http://localhost:3333/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "to": "user@example.com",
    "subject": "Duplicate Test",
    "message": "<p>This should only send once</p>"
  }'

# Second request - duplicate detected (within 5 minutes)
curl -X POST http://localhost:3333/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "to": "user@example.com",
    "subject": "Duplicate Test",
    "message": "<p>This should only send once</p>"
  }'
# Expected: {"status":"duplicate","message":"Request already processed"}
```

## 🔍 Monitor Redis

### Access Redis CLI
```bash
docker exec -it email-sender-redis-1 redis-cli
```

### Useful Redis Commands
```redis
# Check connection
PING

# List all keys
KEYS *

# Get specific key
GET <hash-key>

# Check TTL
TTL <hash-key>

# Monitor all commands in real-time
MONITOR

# Get Redis info
INFO

# Check memory usage
INFO memory

# Count keys
DBSIZE
```

## 🧪 Run Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific test file
npm test RedisConnection.test.ts
```

## 📊 What Changed?

### Before (In-Memory Cache)
```typescript
private static cache: Map<string, EmailCache> = new Map()

private isDuplicate(key: string): boolean {
  const cached = SendMailService.cache.get(key)
  // ...
}
```

### After (Redis Cache)
```typescript
private async isDuplicate(key: string): Promise<{isDuplicate: boolean; cachedResult?: any}> {
  const redis = await RedisConnection.getInstance()
  const cached = await redis.get(key)
  // ...
}
```

## 🎯 Key Benefits

1. **Horizontal Scaling**: Multiple app instances share same cache
2. **Persistence**: Cache survives application restarts
3. **Distributed**: Works across containers/servers
4. **TTL Management**: Automatic expiration of old keys
5. **Production Ready**: Connection pooling, retry logic, health checks

## 📁 New Files

- `src/database/RedisConnection.ts` - Redis singleton
- `src/database/RedisConnection.test.ts` - Tests
- `src/controllers/HealthController.ts` - Health checks
- `REDIS_INTEGRATION.md` - Full documentation
- `TASK_2_SUMMARY.md` - Implementation summary

## 🔧 Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| REDIS_HOST | localhost | Redis server host |
| REDIS_PORT | 6379 | Redis server port |
| REDIS_PASSWORD | - | Optional auth password |
| REDIS_DB | 0 | Database number (0-15) |
| REDIS_MAX_RETRIES | 3 | Connection retry attempts |
| REDIS_CONNECT_TIMEOUT | 10000 | Timeout in milliseconds |
| REDIS_REQUIRED | true | Fail if Redis unavailable |
| IDEMPOTENCY_TTL | 300 | Cache TTL in seconds |

## 🐛 Troubleshooting

### Redis Not Connecting
```bash
# Check if Redis is running
docker ps | grep redis

# Check Redis logs
docker logs email-sender-redis-1

# Restart Redis
docker-compose restart redis
```

### Cache Not Working
```bash
# Check environment variables
docker exec email-sender-app-1 env | grep REDIS

# Monitor Redis operations
docker exec -it email-sender-redis-1 redis-cli MONITOR
```

### Port Already in Use
```bash
# Change port in .env
REDIS_PORT=6380

# Or stop conflicting service
docker ps
docker stop <container-id>
```

## 📚 Documentation

- **REDIS_INTEGRATION.md** - Complete implementation guide
- **TASK_2_SUMMARY.md** - Implementation summary
- **.env.example** - Configuration template
- **MVP_TASKS.md** - Task tracking

## ⏭️ Next Steps

Ready for **Task 3: Message Queue Architecture (SQS)**
- Asynchronous email processing
- Return 202 Accepted immediately
- Worker-based queue consumption
- Dead Letter Queue for failures

---

**Questions?** Check `REDIS_INTEGRATION.md` for detailed documentation.
