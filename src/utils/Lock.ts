import RedisConnection from '../database/RedisConnection'

export default class Lock {
  private static readonly TTL = Number(process.env.LOCK_TTL_SECONDS) || 10

  static async acquire(resource: string): Promise<boolean> {
    try {
      const redis = await RedisConnection.getInstance()
      const result = await redis.set(`lock:${resource}`, '1', 'EX', Lock.TTL, 'NX')
      return result === 'OK'
    } catch (error) {
      console.error('[Lock] acquire failed:', error)
      return false
    }
  }

  static async release(resource: string): Promise<void> {
    try {
      const redis = await RedisConnection.getInstance()
      await redis.del(`lock:${resource}`)
    } catch (error) {
      console.error('[Lock] release failed:', error)
    }
  }
}
