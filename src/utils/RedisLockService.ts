import RedisConnection from '../database/RedisConnection'
import { ILockService } from './ILockService'

export class RedisLockService implements ILockService {
  private static readonly TTL = Number(process.env.LOCK_TTL_SECONDS) || 10

  async acquire(resource: string): Promise<boolean> {
    try {
      const redis = await RedisConnection.getInstance()
      const result = await redis.set(`lock:${resource}`, '1', 'EX', RedisLockService.TTL, 'NX')
      return result === 'OK'
    } catch (error) {
      console.error('[RedisLockService] acquire failed:', error)
      return false
    }
  }

  async release(resource: string): Promise<void> {
    try {
      const redis = await RedisConnection.getInstance()
      await redis.del(`lock:${resource}`)
    } catch (error) {
      console.error('[RedisLockService] release failed:', error)
    }
  }
}
