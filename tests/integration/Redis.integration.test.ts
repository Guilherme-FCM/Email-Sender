import { GenericContainer, StartedTestContainer } from 'testcontainers'
import RedisConnection from '../../src/database/RedisConnection'

describe('RedisConnection integration', () => {
  let container: StartedTestContainer

  beforeAll(async () => {
    container = await new GenericContainer('redis:alpine')
      .withExposedPorts(6379)
      .start()

    process.env.REDIS_HOST = container.getHost()
    process.env.REDIS_PORT = String(container.getMappedPort(6379))
  }, 60_000)

  afterAll(async () => {
    await RedisConnection.close()
    ;(RedisConnection as any).instance = null
    await container.stop()
    delete process.env.REDIS_HOST
    delete process.env.REDIS_PORT
  })

  beforeEach(() => {
    ;(RedisConnection as any).instance = null
  })

  it('should connect and return a working Redis instance', async () => {
    const redis = await RedisConnection.getInstance()
    expect(redis).toBeDefined()
  })

  it('should return true on healthCheck against live Redis', async () => {
    const healthy = await RedisConnection.healthCheck()
    expect(healthy).toBe(true)
  })

  it('should set and get a value', async () => {
    const redis = await RedisConnection.getInstance()
    await redis.set('integration-key', 'hello')
    const value = await redis.get('integration-key')
    expect(value).toBe('hello')
  })

  it('should expire a key after TTL', async () => {
    const redis = await RedisConnection.getInstance()
    await redis.setex('ttl-key', 1, 'expires-soon')

    const before = await redis.get('ttl-key')
    expect(before).toBe('expires-soon')

    await new Promise(resolve => setTimeout(resolve, 1100))

    const after = await redis.get('ttl-key')
    expect(after).toBeNull()
  }, 10_000)

  it('should return the same instance on multiple calls (singleton)', async () => {
    const r1 = await RedisConnection.getInstance()
    const r2 = await RedisConnection.getInstance()
    expect(r1).toBe(r2)
  })

  it('should close the connection cleanly', async () => {
    await RedisConnection.getInstance()
    await expect(RedisConnection.close()).resolves.not.toThrow()
  })
})
