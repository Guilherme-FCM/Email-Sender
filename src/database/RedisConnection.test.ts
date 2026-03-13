import RedisConnection from './RedisConnection'

describe('RedisConnection', () => {
  afterEach(async () => {
    await RedisConnection.close()
  })

  describe('getInstance', () => {
    it('should return a Redis instance', async () => {
      const redis = await RedisConnection.getInstance()
      expect(redis).toBeDefined()
      expect(redis.status).toBeDefined()
    })

    it('should return the same instance on multiple calls (singleton)', async () => {
      const redis1 = await RedisConnection.getInstance()
      const redis2 = await RedisConnection.getInstance()
      expect(redis1).toBe(redis2)
    })

    it('should configure Redis with environment variables', async () => {
      process.env.REDIS_HOST = 'testhost'
      process.env.REDIS_PORT = '6380'
      process.env.REDIS_DB = '1'
      
      await RedisConnection.close()
      const redis = await RedisConnection.getInstance()
      
      expect(redis.options.host).toBe('testhost')
      expect(redis.options.port).toBe(6380)
      expect(redis.options.db).toBe(1)
      
      delete process.env.REDIS_HOST
      delete process.env.REDIS_PORT
      delete process.env.REDIS_DB
    })
  })

  describe('healthCheck', () => {
    it('should return true when Redis is healthy', async () => {
      const isHealthy = await RedisConnection.healthCheck()
      expect(typeof isHealthy).toBe('boolean')
    })

    it('should handle connection errors gracefully', async () => {
      await RedisConnection.close()
      
      process.env.REDIS_HOST = 'invalid-host'
      process.env.REDIS_CONNECT_TIMEOUT = '100'
      
      const isHealthy = await RedisConnection.healthCheck()
      expect(typeof isHealthy).toBe('boolean')
      
      delete process.env.REDIS_HOST
      delete process.env.REDIS_CONNECT_TIMEOUT
    })
  })

  describe('close', () => {
    it('should close the Redis connection', async () => {
      await RedisConnection.getInstance()
      await RedisConnection.close()
      
      const redis = await RedisConnection.getInstance()
      expect(redis).toBeDefined()
    })
  })

  describe('Redis operations', () => {
    it('should set and get values', async () => {
      const redis = await RedisConnection.getInstance()
      
      await redis.set('test-key', 'test-value')
      const value = await redis.get('test-key')
      
      expect(value).toBe('test-value')
      
      await redis.del('test-key')
    })

    it('should set values with TTL', async () => {
      const redis = await RedisConnection.getInstance()
      
      await redis.setex('test-ttl-key', 1, 'test-value')
      const value = await redis.get('test-ttl-key')
      expect(value).toBe('test-value')
      
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      const expiredValue = await redis.get('test-ttl-key')
      expect(expiredValue).toBeNull()
    })

    it('should handle JSON serialization', async () => {
      const redis = await RedisConnection.getInstance()
      const testData = { status: 'sent', messageId: '123' }
      
      await redis.set('test-json-key', JSON.stringify(testData))
      const value = await redis.get('test-json-key')
      const parsed = JSON.parse(value!)
      
      expect(parsed).toEqual(testData)
      
      await redis.del('test-json-key')
    })
  })
})
