import SendMailService from './SendMailService'
import MailSender from './MailSender'
import { EmailRepository } from '../repositories/EmailRepository'
import { generatePayloadHash } from '../utils/hashGenerator'

jest.mock('./MailSender')
jest.mock('../repositories/EmailRepository')
jest.mock('../utils/hashGenerator')

describe('SendMailService', () => {
  let service: SendMailService
  let mockSendMail: jest.Mock

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' })
    ;(MailSender as jest.MockedClass<typeof MailSender>).mockImplementation(() => ({
      sendMail: mockSendMail,
    } as any))
    ;(EmailRepository as jest.MockedClass<typeof EmailRepository>).mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(undefined),
      saveWithIdempotency: jest.fn().mockResolvedValue({ success: true }),
      all: jest.fn().mockResolvedValue({ Items: [] })
    } as any))
    ;(generatePayloadHash as jest.Mock).mockImplementation((data) => {
      const from = typeof data.from === 'string' ? data.from : data.from.address
      const to = typeof data.to === 'string' ? data.to : data.to.address
      return `${from}|${to}|${data.subject}`
    })
    service = new SendMailService()
    jest.clearAllMocks()
  })

  it('should prevent duplicate emails within 5 minutes with same sender, recipients and subject', async () => {
    const emailData = {
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Test Subject',
      message: '<p>Test message</p>',
    }

    await service.execute(emailData)
    expect(mockSendMail).toHaveBeenCalledTimes(1)

    await service.execute(emailData)
    expect(mockSendMail).toHaveBeenCalledTimes(1)
  })

  it('should allow email after 5 minutes', async () => {
    jest.useFakeTimers()
    const mockSave = jest.fn().mockResolvedValue(undefined)
    const mockSendMailLocal = jest.fn().mockResolvedValue({ messageId: '789' })
    ;(EmailRepository as jest.MockedClass<typeof EmailRepository>).mockImplementation(() => ({
      save: mockSave,
    } as any))
    ;(MailSender as jest.MockedClass<typeof MailSender>).mockImplementation(() => ({
      sendMail: mockSendMailLocal,
    } as any))
    
    const testService = new SendMailService()
    
    const emailData = {
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Test Subject',
      message: '<p>Test message</p>',
    }

    await testService.execute(emailData)
    expect(mockSendMailLocal).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(5 * 60 * 1000 + 1)

    await testService.execute(emailData)
    expect(mockSendMailLocal).toHaveBeenCalledTimes(2)

    jest.useRealTimers()
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
    const mockSave = jest.fn().mockResolvedValue(undefined)
    const mockSendMailLocal = jest.fn().mockResolvedValue({ messageId: '456' })
    ;(EmailRepository as jest.MockedClass<typeof EmailRepository>).mockImplementation(() => ({
      save: mockSave,
    } as any))
    ;(MailSender as jest.MockedClass<typeof MailSender>).mockImplementation(() => ({
      sendMail: mockSendMailLocal,
    } as any))

    const newService = new SendMailService()

    const emailData = {
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Test Subject',
      message: '<p>Test message</p>',
      text: 'Test message',
    }

    await newService.execute(emailData)

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
    beforeEach(() => {
      (generatePayloadHash as jest.Mock).mockReturnValue('mock-hash-123')
    })

    it('should prevent duplicate when same payload hash is detected', async () => {
      const emailData = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        message: '<p>Test Message</p>'
      }

      const result1 = await service.execute(emailData)
      const result2 = await service.execute(emailData)

      expect(mockSendMail).toHaveBeenCalledTimes(1)
      expect(result2).toEqual(result1)
    })

    it('should generate payload hash automatically', async () => {
      const emailData = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
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
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Subject 1',
        message: '<p>Test Message</p>'
      }

      const emailData2 = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
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
      (generatePayloadHash as jest.Mock).mockReturnValue('concurrent-hash')

      const emailData = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        message: '<p>Test Message</p>'
      }

      const results = await Promise.all([
        service.execute(emailData),
        service.execute(emailData),
        service.execute(emailData)
      ])

      expect(mockSendMail).toHaveBeenCalledTimes(1)
      expect(results[1]).toEqual(results[0])
      expect(results[2]).toEqual(results[0])
    })
  })
})
