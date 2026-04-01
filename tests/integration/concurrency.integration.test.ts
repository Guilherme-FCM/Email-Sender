import { GenericContainer, StartedTestContainer } from 'testcontainers'
import RedisConnection from '../../src/database/RedisConnection'
import Lock from '../../src/utils/Lock'
import SendMailService from '../../src/services/SendMailService'
import MailSender from '../../src/services/MailSender'
import { EmailRepository } from '../../src/repositories/EmailRepository'

jest.mock('../../src/services/MailSender')
jest.mock('../../src/repositories/EmailRepository')

describe('Concurrency integration', () => {
  let container: StartedTestContainer
  let mockSendMail: jest.Mock
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
    ;(RedisConnection as any).instance = null
    await container.stop()
    delete process.env.REDIS_HOST
    delete process.env.REDIS_PORT
    delete process.env.REDIS_REQUIRED
    delete process.env.IDEMPOTENCY_TTL
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(RedisConnection as any).instance = null

    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'smtp-race-001' })
    mockSave = jest.fn().mockResolvedValue(undefined)

    ;(MailSender as jest.MockedClass<typeof MailSender>).mockImplementation(() => ({
      sendMail: mockSendMail,
    } as any))
    ;(EmailRepository as jest.MockedClass<typeof EmailRepository>).mockImplementation(() => ({
      save: mockSave,
      all: jest.fn().mockResolvedValue({ Items: [] }),
    } as any))
  })

  describe('Lock', () => {
    it('should acquire a lock and return true', async () => {
      const acquired = await Lock.acquire('test-resource')
      expect(acquired).toBe(true)
      await Lock.release('test-resource')
    })

    it('should return false when lock is already held', async () => {
      await Lock.acquire('held-resource')
      const second = await Lock.acquire('held-resource')
      expect(second).toBe(false)
      await Lock.release('held-resource')
    })

    it('should allow re-acquisition after release', async () => {
      await Lock.acquire('reacquire-resource')
      await Lock.release('reacquire-resource')
      const reacquired = await Lock.acquire('reacquire-resource')
      expect(reacquired).toBe(true)
      await Lock.release('reacquire-resource')
    })

    it('should isolate locks by resource key', async () => {
      const a = await Lock.acquire('resource-a')
      const b = await Lock.acquire('resource-b')
      expect(a).toBe(true)
      expect(b).toBe(true)
      await Lock.release('resource-a')
      await Lock.release('resource-b')
    })
  })

  describe('Race conditions', () => {
    it('should send email exactly once under 10 concurrent identical requests', async () => {
      const service = new SendMailService()

      const results = await Promise.all(
        Array.from({ length: 10 }, () => service.execute(emailData))
      )

      expect(results).toHaveLength(10)

      const sent = results.filter(r => r && (r as any).messageId === 'smtp-race-001')
      const processing = results.filter(r => r && (r as any).status === 'processing')
      const duplicate = results.filter(r => r && (r as any).status === 'duplicate')

      // Exactly one request should have gone through to SMTP
      expect(mockSendMail).toHaveBeenCalledTimes(1)
      // All results must be accounted for
      expect(sent.length + processing.length + duplicate.length).toBe(10)
    })

    it('should not call repository save more than once for concurrent identical requests', async () => {
      const service = new SendMailService()

      await Promise.all(
        Array.from({ length: 5 }, () => service.execute({ ...emailData, subject: 'Save-Once Test' }))
      )

      expect(mockSave).toHaveBeenCalledTimes(1)
    })
  })
})
