import SendMailService from './SendMailService'
import MailSender from './MailSender'
import { EmailRepository } from '../repositories/EmailRepository'

jest.mock('./MailSender')
jest.mock('../repositories/EmailRepository')

describe('SendMailService', () => {
  let service: SendMailService
  let mockSendMail: jest.Mock

  beforeEach(() => {
    service = new SendMailService()
    mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' })
    ;(MailSender as jest.MockedClass<typeof MailSender>).mockImplementation(() => ({
      sendMail: mockSendMail,
    } as any))
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
    
    const emailData = {
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Test Subject',
      message: '<p>Test message</p>',
    }

    await service.execute(emailData)
    expect(mockSendMail).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(5 * 60 * 1000 + 1)

    await service.execute(emailData)
    expect(mockSendMail).toHaveBeenCalledTimes(2)

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
    ;(EmailRepository as jest.MockedClass<typeof EmailRepository>).mockImplementation(() => ({
      save: mockSave,
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
})
