import RedisConnection from './RedisConnection'
import Redis from 'ioredis'

jest.mock('ioredis')

describe('RedisConnection', () => {
  let mockRedis: any

  beforeEach(() => {
    jest.clearAllMocks()
    ;(RedisConnection as any).instance = null

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue('OK'),
      connect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      status: 'ready',
      options: {
        host: 'localhost',
        port: 6379,
        db: 0
      }
    }

    ;(Redis as unknown as jest.Mock).mockImplementation(() => mockRedis)
  })

  afterEach(() => {
    ;(RedisConnection as any).instance = null
  })

  describe('getInstance', () => {
    it('should return a Redis instance', async () => {
      const redis = await RedisConnection.getInstance()
      expect(redis).toBeDefined()
      expect(redis).toBe(mockRedis)
    })

    it('should return the same instance on multiple calls (singleton)', async () => {
      const redis1 = await RedisConnection.getInstance()
      const redis2 = await RedisConnection.getInstance()
      expect(redis1).toBe(redis2)
      expect(Redis).toHaveBeenCalledTimes(1)
    })

    it('should configure Redis with environment variables', async () => {
      process.env.REDIS_HOST = 'testhost'
      process.env.REDIS_PORT = '6380'
      process.env.REDIS_DB = '1'
      
      await RedisConnection.getInstance()
      
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'testhost',
          port: 6380,
          db: 1,
          lazyConnect: true,
        })
      )
      
      delete process.env.REDIS_HOST
      delete process.env.REDIS_PORT
      delete process.env.REDIS_DB
    })

    it('should register event handlers', async () => {
      await RedisConnection.getInstance()

      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockRedis.on).toHaveBeenCalledWith('end', expect.any(Function))
    })

    it('should invoke event callbacks without throwing', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const handlers: Record<string, Function> = {}
      mockRedis.on.mockImplementation((event: string, cb: Function) => {
        handlers[event] = cb
      })
      // connect must resolve before handlers are invoked
      mockRedis.connect.mockResolvedValue(undefined)

      await RedisConnection.getInstance()

      handlers['error'](new Error('test error'))
      handlers['end']()

      expect(consoleSpy).toHaveBeenCalledWith('Redis connection error:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('healthCheck', () => {
    it('should return true when Redis is healthy', async () => {
      const isHealthy = await RedisConnection.healthCheck()
      expect(isHealthy).toBe(true)
      expect(mockRedis.ping).toHaveBeenCalled()
    })

    it('should return false when Redis ping fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      mockRedis.ping.mockRejectedValueOnce(new Error('Connection failed'))
      
      const isHealthy = await RedisConnection.healthCheck()
      expect(isHealthy).toBe(false)
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('close', () => {
    it('should close the Redis connection', async () => {
      await RedisConnection.getInstance()
      await RedisConnection.close()
      
      expect(mockRedis.quit).toHaveBeenCalled()
    })

    it('should handle close when no instance exists', async () => {
      await RedisConnection.close()
      expect(mockRedis.quit).not.toHaveBeenCalled()
    })
  })

  describe('Redis operations', () => {
    it('should set and get values', async () => {
      mockRedis.set.mockResolvedValue('OK')
      mockRedis.get.mockResolvedValue('test-value')
      
      const redis = await RedisConnection.getInstance()
      
      await redis.set('test-key', 'test-value')
      const value = await redis.get('test-key')
      
      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value')
      expect(mockRedis.get).toHaveBeenCalledWith('test-key')
      expect(value).toBe('test-value')
    })

    it('should set values with TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK')
      mockRedis.get.mockResolvedValue('test-value')
      
      const redis = await RedisConnection.getInstance()
      
      await redis.setex('test-ttl-key', 300, 'test-value')
      const value = await redis.get('test-ttl-key')
      
      expect(mockRedis.setex).toHaveBeenCalledWith('test-ttl-key', 300, 'test-value')
      expect(value).toBe('test-value')
    })

    it('should handle JSON serialization', async () => {
      const testData = { status: 'sent', messageId: '123' }
      mockRedis.set.mockResolvedValue('OK')
      mockRedis.get.mockResolvedValue(JSON.stringify(testData))
      
      const redis = await RedisConnection.getInstance()
      
      await redis.set('test-json-key', JSON.stringify(testData))
      const value = await redis.get('test-json-key')
      const parsed = JSON.parse(value!)
      
      expect(parsed).toEqual(testData)
    })
  })
})
