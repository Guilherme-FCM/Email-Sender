import SendMailService from './SendMailService'
import MailSender from './MailSender'
import { EmailRepository } from '../repositories/EmailRepository'
import { generatePayloadHash } from '../utils/hashGenerator'
import RedisConnection from '../database/RedisConnection'
import Lock from '../utils/Lock'

jest.mock('./MailSender')
jest.mock('../repositories/EmailRepository')
jest.mock('../utils/hashGenerator')
jest.mock('../database/RedisConnection')
jest.mock('../utils/Lock')

describe('SendMailService', () => {
  let service: SendMailService
  let mockSendMail: jest.Mock
  let mockRedisGet: jest.Mock
  let mockRedisSetex: jest.Mock
  let mockSave: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()

    ;(Lock.acquire as jest.Mock).mockResolvedValue(true)
    ;(Lock.release as jest.Mock).mockResolvedValue(undefined)
    
    mockRedisGet = jest.fn().mockResolvedValue(null)
    mockRedisSetex = jest.fn().mockResolvedValue('OK')
    mockSave = jest.fn().mockResolvedValue(undefined)
    
    ;(RedisConnection.getInstance as jest.Mock).mockResolvedValue({
      get: mockRedisGet,
      setex: mockRedisSetex,
    })
    
    mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' })
    ;(MailSender as jest.MockedClass<typeof MailSender>).mockImplementation(() => ({
      sendMail: mockSendMail,
    } as any))
    ;(EmailRepository as jest.MockedClass<typeof EmailRepository>).mockImplementation(() => ({
      save: mockSave,
      all: jest.fn().mockResolvedValue({ Items: [] })
    } as any))
    ;(generatePayloadHash as jest.Mock).mockImplementation((data) => {
      const from = typeof data.from === 'string' ? data.from : data.from.address
      const to = typeof data.to === 'string' ? data.to : data.to.address
      return `${from}|${to}|${data.subject}`
    })
    
    service = new SendMailService()
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

    const result1 = await service.execute(emailData)
    expect(mockSendMail).toHaveBeenCalledTimes(1)
    expect(mockRedisSetex).toHaveBeenCalled()
    expect(result1).toEqual({ messageId: '123' })

    mockRedisGet.mockResolvedValueOnce(JSON.stringify({ messageId: '123' }))
    
    const result2 = await service.execute(emailData)
    expect(mockSendMail).toHaveBeenCalledTimes(1)
    expect(result2).toEqual({ messageId: '123' })
  })

  it('should allow email after TTL expires', async () => {
    const emailData = {
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Test Subject',
      message: '<p>Test message</p>',
    }

    await service.execute(emailData)
    expect(mockSendMail).toHaveBeenCalledTimes(1)

    mockRedisGet.mockResolvedValueOnce(null)

    await service.execute(emailData)
    expect(mockSendMail).toHaveBeenCalledTimes(2)
  })

  it('should allow emails with different subjects', async () => {
    const emailData1 = {
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Subject 1',
      message: '<p>Test message</p>',
    }

    const emailData2 = {
      ...emailData1,
      subject: 'Subject 2',
    }

    await service.execute(emailData1)
    await service.execute(emailData2)
    
    expect(mockSendMail).toHaveBeenCalledTimes(2)
  })

  it('should save email data to database using EmailRepository', async () => {
    const emailData = {
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Test Subject',
      message: '<p>Test message</p>',
      text: 'Test message',
    }

    await service.execute(emailData)

    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSave).toHaveBeenCalledWith(
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
        message: '<p>Test Message</p>'
      }

      await service.execute(emailData)
      expect(mockSendMail).toHaveBeenCalledTimes(1)
      
      mockRedisGet.mockResolvedValueOnce(JSON.stringify({ messageId: '123' }))
      
      await service.execute(emailData)
      expect(mockSendMail).toHaveBeenCalledTimes(1)
    })

    it('should generate payload hash automatically', async () => {
      const emailData = {
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Test Message</p>'
      }

      await service.execute(emailData)

      expect(generatePayloadHash).toHaveBeenCalledWith(emailData)
    })

    it('should allow different requests with different subjects', async () => {
      (generatePayloadHash as jest.Mock)
        .mockReturnValueOnce('hash-1')
        .mockReturnValueOnce('hash-2')

      const emailData1 = {
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Subject 1',
        message: '<p>Test Message</p>'
      }

      const emailData2 = {
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Subject 2',
        message: '<p>Test Message</p>'
      }

      await service.execute(emailData1)
      await service.execute(emailData2)

      expect(mockSendMail).toHaveBeenCalledTimes(2)
    })
  })

  describe('Concurrent requests', () => {
    it('should handle concurrent identical requests safely', async () => {
      ;(generatePayloadHash as jest.Mock).mockReturnValue('concurrent-hash')
      
      let callCount = 0
      mockRedisGet.mockImplementation(async () => {
        callCount++
        if (callCount === 1) return null
        return JSON.stringify({ messageId: '123' })
      })

      const emailData = {
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Test Message</p>'
      }

      const results = await Promise.all([
        service.execute(emailData),
        service.execute(emailData),
        service.execute(emailData)
      ])

      expect(results).toHaveLength(3)
      expect(results[0]).toBeDefined()
      expect(mockSendMail).toHaveBeenCalled()
    })
  })

  describe('listAll', () => {
    it('should delegate to repository and return all emails', async () => {
      const mockAll = jest.fn().mockResolvedValue({ Items: [{ id: '1' }] })
      ;(EmailRepository as jest.MockedClass<typeof EmailRepository>).mockImplementation(() => ({
        save: mockSave,
        all: mockAll,
      } as any))

      const result = await new SendMailService().listAll()

      expect(mockAll).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ Items: [{ id: '1' }] })
    })
  })

  it('should return error response when MailSender.sendMail returns an Error', async () => {
    mockSendMail.mockResolvedValue(new Error('SMTP connection refused'))

    const result = await service.execute({
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Test Subject',
      message: '<p>Hi</p>',
    })

    expect(result).toEqual(expect.objectContaining({ success: false, error: 'SMTP connection refused' }))
  })

  describe('Redis unavailable', () => {
    it('should return error when Redis is required and unavailable', async () => {
      process.env.REDIS_REQUIRED = 'true'
      ;(RedisConnection.getInstance as jest.Mock).mockRejectedValue(new Error('Connection refused'))

      const result = await service.execute({
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Hi</p>',
      })

      expect(result).toEqual(expect.objectContaining({ success: false }))
      delete process.env.REDIS_REQUIRED
    })

    it('should proceed without cache when Redis is optional and unavailable', async () => {
      ;(SendMailService as any).REDIS_REQUIRED = false
      ;(RedisConnection.getInstance as jest.Mock).mockRejectedValue(new Error('Connection refused'))

      const result = await service.execute({
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Hi</p>',
      })

      expect(mockSendMail).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ messageId: '123' })
      ;(SendMailService as any).REDIS_REQUIRED = true
    })
  })
})
