import SendMailUseCase from './SendMailUseCase'
import { IEmailSender } from './IEmailSender'
import { IEmailRepository } from '../repositories/IEmailRepository'
import { ICacheService } from '../utils/ICacheService'
import { ILockService } from '../utils/ILockService'
import { generatePayloadHash } from '../utils/hashGenerator'

jest.mock('../utils/hashGenerator')

const makeEmailSender = (overrides = {}): jest.Mocked<IEmailSender> => ({
  send: jest.fn().mockResolvedValue({ messageId: '123' }),
  ...overrides,
})

const makeRepository = (overrides = {}): jest.Mocked<IEmailRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  all: jest.fn().mockResolvedValue([]),
  ...overrides,
})

const makeCache = (overrides = {}): jest.Mocked<ICacheService> => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  ...overrides,
})

const makeLock = (overrides = {}): jest.Mocked<ILockService> => ({
  acquire: jest.fn().mockResolvedValue(true),
  release: jest.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('SendMailUseCase', () => {
  let emailSender: jest.Mocked<IEmailSender>
  let repository: jest.Mocked<IEmailRepository>
  let cache: jest.Mocked<ICacheService>
  let lock: jest.Mocked<ILockService>
  let useCase: SendMailUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()

    emailSender = makeEmailSender()
    repository = makeRepository()
    cache = makeCache()
    lock = makeLock()

    ;(generatePayloadHash as jest.Mock).mockImplementation((data) => {
      const from = typeof data.from === 'string' ? data.from : data.from.address
      const to = typeof data.to === 'string' ? data.to : data.to.address
      return `${from}|${to}|${data.subject}`
    })

    useCase = new SendMailUseCase(emailSender, repository, cache, lock)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should prevent duplicate emails within TTL with same sender, recipients and subject', async () => {
    const emailData = {
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Test Subject',
      message: '<p>Test message</p>',
    }

    const result1 = await useCase.execute(emailData)
    expect(emailSender.send).toHaveBeenCalledTimes(1)
    expect(cache.set).toHaveBeenCalled()
    expect(result1).toEqual({ messageId: '123' })

    cache.get.mockResolvedValueOnce(JSON.stringify({ messageId: '123' }))

    const result2 = await useCase.execute(emailData)
    expect(emailSender.send).toHaveBeenCalledTimes(1)
    expect(result2).toEqual({ messageId: '123' })
  })

  it('should allow email after TTL expires', async () => {
    const emailData = {
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Test Subject',
      message: '<p>Test message</p>',
    }

    await useCase.execute(emailData)
    expect(emailSender.send).toHaveBeenCalledTimes(1)

    cache.get.mockResolvedValueOnce(null)

    await useCase.execute(emailData)
    expect(emailSender.send).toHaveBeenCalledTimes(2)
  })

  it('should allow emails with different subjects', async () => {
    const base = {
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      message: '<p>Test message</p>',
    }

    await useCase.execute({ ...base, subject: 'Subject 1' })
    await useCase.execute({ ...base, subject: 'Subject 2' })

    expect(emailSender.send).toHaveBeenCalledTimes(2)
  })

  it('should save email data to repository', async () => {
    const emailData = {
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Test Subject',
      message: '<p>Test message</p>',
      text: 'Test message',
    }

    await useCase.execute(emailData)

    expect(repository.save).toHaveBeenCalledTimes(1)
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        message: '<p>Test message</p>',
        text: 'Test message',
      })
    )
  })

  describe('Idempotency with payload hash', () => {
    it('should prevent duplicate when same payload hash is detected', async () => {
      ;(generatePayloadHash as jest.Mock).mockReturnValue('mock-hash-123')

      const emailData = {
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Test Message</p>',
      }

      await useCase.execute(emailData)
      expect(emailSender.send).toHaveBeenCalledTimes(1)

      cache.get.mockResolvedValueOnce(JSON.stringify({ messageId: '123' }))

      await useCase.execute(emailData)
      expect(emailSender.send).toHaveBeenCalledTimes(1)
    })

    it('should generate payload hash automatically', async () => {
      const emailData = {
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Test Message</p>',
      }

      await useCase.execute(emailData)

      expect(generatePayloadHash).toHaveBeenCalledWith(emailData)
    })

    it('should allow different requests with different subjects', async () => {
      ;(generatePayloadHash as jest.Mock)
        .mockReturnValueOnce('hash-1')
        .mockReturnValueOnce('hash-2')

      const base = {
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        message: '<p>Test Message</p>',
      }

      await useCase.execute({ ...base, subject: 'Subject 1' })
      await useCase.execute({ ...base, subject: 'Subject 2' })

      expect(emailSender.send).toHaveBeenCalledTimes(2)
    })
  })

  describe('Concurrent requests', () => {
    it('should handle concurrent identical requests safely', async () => {
      ;(generatePayloadHash as jest.Mock).mockReturnValue('concurrent-hash')

      let callCount = 0
      cache.get.mockImplementation(async () => {
        callCount++
        if (callCount === 1) return null
        return JSON.stringify({ messageId: '123' })
      })

      const emailData = {
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Test Message</p>',
      }

      const results = await Promise.all([
        useCase.execute(emailData),
        useCase.execute(emailData),
        useCase.execute(emailData),
      ])

      expect(results).toHaveLength(3)
      expect(results[0]).toBeDefined()
      expect(emailSender.send).toHaveBeenCalled()
    })
  })

  describe('listAll', () => {
    it('should delegate to repository and return all emails', async () => {
      const mockEmails = [{ id: '1' }] as any[]
      repository.all.mockResolvedValue(mockEmails)

      const result = await useCase.listAll()

      expect(repository.all).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockEmails)
    })
  })

  describe('Cache unavailable', () => {
    it('should return error when cache is required and unavailable', async () => {
      process.env.REDIS_REQUIRED = 'true'
      cache.get.mockRejectedValue(new Error('Connection refused'))

      const result = await useCase.execute({
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Hi</p>',
      })

      expect(result).toEqual(expect.objectContaining({ success: false }))
      delete process.env.REDIS_REQUIRED
    })

    it('should proceed without cache when cache is optional and unavailable', async () => {
      process.env.REDIS_REQUIRED = 'false'
      cache.get.mockRejectedValue(new Error('Connection refused'))

      const result = await useCase.execute({
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Hi</p>',
      })

      expect(emailSender.send).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ messageId: '123' })
      delete process.env.REDIS_REQUIRED
    })
  })
})
