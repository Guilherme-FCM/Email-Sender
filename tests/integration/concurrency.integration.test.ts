import { GenericContainer, StartedTestContainer } from 'testcontainers'
import RedisConnection from '../../src/database/RedisConnection'
import { RedisLockService } from '../../src/utils/RedisLockService'
import { RedisCacheService } from '../../src/utils/RedisCacheService'
import SendMailService from '../../src/services/SendMailService'
import { IEmailSender } from '../../src/services/IEmailSender'
import { IEmailRepository } from '../../src/repositories/IEmailRepository'

describe('Concurrency integration', () => {
  let container: StartedTestContainer
  let mockSend: jest.Mock
  let mockSave: jest.Mock

  const emailData = {
    from: { address: 'sender@example.com', name: 'Sender' },
    to: { address: 'recipient@example.com', name: 'Recipient' },
    subject: 'Concurrency Test',
    message: '<p>Hello</p>',
  }

  beforeAll(async () => {
    container = await new GenericContainer('redis:alpine')
      .withExposedPorts(6379)
      .start()

    process.env.REDIS_HOST = container.getHost()
    process.env.REDIS_PORT = String(container.getMappedPort(6379))
    process.env.REDIS_REQUIRED = 'true'
    process.env.IDEMPOTENCY_TTL = '60'
  }, 60_000)

  afterAll(async () => {
    await RedisConnection.close()
    await container.stop()
    delete process.env.REDIS_HOST
    delete process.env.REDIS_PORT
    delete process.env.REDIS_REQUIRED
    delete process.env.IDEMPOTENCY_TTL
  })

  beforeEach(async () => {
    jest.clearAllMocks()
    mockSend = jest.fn().mockResolvedValue({ messageId: 'smtp-race-001' })
    mockSave = jest.fn().mockResolvedValue(undefined)
  })

  describe('RedisLockService', () => {
    let lockService: RedisLockService

    beforeAll(async () => {
      await RedisConnection.getInstance()
      lockService = new RedisLockService()
    })

    afterEach(async () => {
      const redis = await RedisConnection.getInstance()
      await redis.del('lock:test-resource', 'lock:held-resource', 'lock:reacquire-resource', 'lock:resource-a', 'lock:resource-b')
    })

    it('should acquire a lock and return true', async () => {
      const acquired = await lockService.acquire('test-resource')
      expect(acquired).toBe(true)
      await lockService.release('test-resource')
    })

    it('should return false when lock is already held', async () => {
      await lockService.acquire('held-resource')
      const second = await lockService.acquire('held-resource')
      expect(second).toBe(false)
      await lockService.release('held-resource')
    })

    it('should allow re-acquisition after release', async () => {
      await lockService.acquire('reacquire-resource')
      await lockService.release('reacquire-resource')
      const reacquired = await lockService.acquire('reacquire-resource')
      expect(reacquired).toBe(true)
      await lockService.release('reacquire-resource')
    })

    it('should isolate locks by resource key', async () => {
      const a = await lockService.acquire('resource-a')
      const b = await lockService.acquire('resource-b')
      expect(a).toBe(true)
      expect(b).toBe(true)
      await lockService.release('resource-a')
      await lockService.release('resource-b')
    })
  })

  describe('Race conditions', () => {
    it('should send email exactly once under 10 concurrent identical requests', async () => {
      const emailSender: IEmailSender = { send: mockSend }
      const repository: IEmailRepository = { save: mockSave, all: jest.fn().mockResolvedValue([]) }
      const service = new SendMailService(emailSender, repository, new RedisCacheService(), new RedisLockService())

      const results = await Promise.all(
        Array.from({ length: 10 }, () => service.execute(emailData))
      )

      expect(results).toHaveLength(10)

      const sent = results.filter(r => r && (r as any).messageId === 'smtp-race-001')
      const processing = results.filter(r => r && (r as any).status === 'processing')
      const duplicate = results.filter(r => r && (r as any).status === 'duplicate')

      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(sent.length + processing.length + duplicate.length).toBe(10)
    })

    it('should not call repository save more than once for concurrent identical requests', async () => {
      const emailSender: IEmailSender = { send: mockSend }
      const repository: IEmailRepository = { save: mockSave, all: jest.fn().mockResolvedValue([]) }
      const service = new SendMailService(emailSender, repository, new RedisCacheService(), new RedisLockService())

      await Promise.all(
        Array.from({ length: 5 }, () => service.execute({ ...emailData, subject: 'Save-Once Test' }))
      )

      expect(mockSave).toHaveBeenCalledTimes(1)
    })
  })
})
