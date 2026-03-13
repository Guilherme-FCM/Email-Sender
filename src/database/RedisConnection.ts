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
  private static config: RedisConfig = new RedisConfig()

  static async getInstance(): Promise<Redis> {
    if (!this.instance) {
      this.instance = new Redis({
        host: this.config.getHost(),
        port: this.config.getPort(),
        password: this.config.getPassword(),
        db: this.config.getDb(),
        maxRetriesPerRequest: this.config.getMaxRetriesPerRequest(),
        connectTimeout: this.config.getConnectTimeout(),
        retryStrategy: (times: number) => {
          if (times > this.config.getMaxRetriesPerRequest()) {
            return null
          }
          return Math.min(times * 100, 3000)
        }
      })

      this.instance.on('error', (error) => {
        console.error('Redis connection error:', error)
      })

      this.instance.on('connect', () => {
        console.log('Redis connected successfully')
      })

      this.instance.on('ready', () => {
        console.log('Redis ready to accept commands')
      })

      this.instance.on('reconnecting', () => {
        console.log('Redis reconnecting...')
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
