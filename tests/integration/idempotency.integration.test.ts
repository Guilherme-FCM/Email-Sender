import { GenericContainer, StartedTestContainer } from 'testcontainers'
import RedisConnection from '../../src/database/RedisConnection'
import { RedisCacheService } from '../../src/utils/RedisCacheService'
import { RedisLockService } from '../../src/utils/RedisLockService'
import SendMailService from '../../src/services/SendMailService'
import { IEmailSender } from '../../src/services/IEmailSender'
import { IEmailRepository } from '../../src/repositories/IEmailRepository'

describe('Idempotency integration', () => {
  let container: StartedTestContainer
  let mockSend: jest.Mock
  let mockSave: jest.Mock

  const emailData = {
    from: { address: 'sender@example.com', name: 'Sender' },
    to: { address: 'recipient@example.com', name: 'Recipient' },
    subject: 'Idempotency Test',
    message: '<p>Hello</p>',
  }

  beforeAll(async () => {
    container = await new GenericContainer('redis:alpine')
      .withExposedPorts(6379)
      .start()

    process.env.REDIS_HOST = container.getHost()
    process.env.REDIS_PORT = String(container.getMappedPort(6379))
    process.env.REDIS_REQUIRED = 'true'
    process.env.IDEMPOTENCY_TTL = '2'
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
    const redis = await RedisConnection.getInstance()
    await redis.flushdb()

    mockSend = jest.fn().mockResolvedValue({ messageId: 'smtp-001' })
    mockSave = jest.fn().mockResolvedValue(undefined)
  })

  const makeService = () => {
    const emailSender: IEmailSender = { send: mockSend }
    const repository: IEmailRepository = { save: mockSave, all: jest.fn().mockResolvedValue([]) }
    return new SendMailService(emailSender, repository, new RedisCacheService(), new RedisLockService())
  }

  it('should send email only once for duplicate requests within TTL', async () => {
    const service = makeService()

    const result1 = await service.execute(emailData)
    const result2 = await service.execute(emailData)

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(result1).toEqual({ messageId: 'smtp-001' })
    expect(result2).toEqual({ messageId: 'smtp-001' })
  })

  it('should allow resend after TTL expires', async () => {
    const ttlEmailData = { ...emailData, subject: 'TTL Expiry Test' }
    const service = makeService()

    await service.execute(ttlEmailData)
    expect(mockSend).toHaveBeenCalledTimes(1)

    const { generatePayloadHash } = await import('../../src/utils/hashGenerator')
    const key = generatePayloadHash(ttlEmailData)
    const redis = await RedisConnection.getInstance()
    await redis.del(key)

    await service.execute(ttlEmailData)
    expect(mockSend).toHaveBeenCalledTimes(2)
  }, 15_000)

  it('should treat requests with different subjects as distinct', async () => {
    const service = makeService()

    await service.execute({ ...emailData, subject: 'Subject A' })
    await service.execute({ ...emailData, subject: 'Subject B' })

    expect(mockSend).toHaveBeenCalledTimes(2)
  })
})
