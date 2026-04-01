import Redis from 'ioredis'

class RedisConfig {
  private host = process.env.REDIS_HOST || 'localhost'
  private port = Number(process.env.REDIS_PORT) || 6379
  private password = process.env.REDIS_PASSWORD || undefined
  private db = Number(process.env.REDIS_DB) || 0
  private maxRetriesPerRequest = Number(process.env.REDIS_MAX_RETRIES) || 3
  private connectTimeout = Number(process.env.REDIS_CONNECT_TIMEOUT) || 10000

  getHost(): string {
    return this.host
  }

  getPort(): number {
    return this.port
  }

  getPassword(): string | undefined {
    return this.password
  }

  getDb(): number {
    return this.db
  }

  getMaxRetriesPerRequest(): number {
    return this.maxRetriesPerRequest
  }

  getConnectTimeout(): number {
    return this.connectTimeout
  }
}

export default class RedisConnection {
  private static instance: Redis | null = null

  private static getConfig(): RedisConfig {
    return new RedisConfig()
  }

  static async getInstance(): Promise<Redis> {
    if (!this.instance) {
      const config = this.getConfig()
      const isTest = process.env.NODE_ENV === 'test'
      this.instance = new Redis({
        host: config.getHost(),
        port: config.getPort(),
        password: config.getPassword(),
        db: config.getDb(),
        maxRetriesPerRequest: config.getMaxRetriesPerRequest(),
        connectTimeout: isTest ? 2000 : config.getConnectTimeout(),
        retryStrategy: isTest ? () => null : (times: number) => Math.min(times * 100, 3000),
        lazyConnect: true,
      })
      await this.instance.connect()

      this.instance.on('error', (error) => {
        console.error('Redis connection error:', error)
      })

      this.instance.on('end', () => {
        this.instance = null
      })
    }

    return this.instance
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const redis = await this.getInstance()
      const result = await redis.ping()
      return result === 'PONG'
    } catch (error) {
      console.error('Redis health check failed:', error)
      return false
    }
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.quit()
      this.instance = null
    }
  }
}
