import RedisConnection from '../database/RedisConnection'
import { ICacheService } from './ICacheService'

export class RedisCacheService implements ICacheService {
  async get(key: string): Promise<string | null> {
    const redis = await RedisConnection.getInstance()
    return redis.get(key)
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const redis = await RedisConnection.getInstance()
    await redis.setex(key, ttlSeconds, value)
  }
}
