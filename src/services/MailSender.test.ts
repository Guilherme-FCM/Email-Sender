import MailSender from './MailSender'
import nodemailer from 'nodemailer'

jest.mock('nodemailer')

describe('MailSender', () => {
  let mockSendMail: jest.Mock
  let mockCreateTransport: jest.Mock

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' })
    mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });
    (nodemailer.createTransport as jest.Mock) = mockCreateTransport
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should send email successfully', async () => {
    const mailSender = new MailSender(
      { address: 'sender@example.com', name: 'Sender' },
      { address: 'recipient@example.com', name: 'Recipient' },
      'Test Subject',
      '<p>Test message</p>'
    )

    const result = await mailSender.sendMail()

    expect(mockCreateTransport).toHaveBeenCalled()
    expect(mockSendMail).toHaveBeenCalled()
    expect(result).toEqual({ messageId: '123' })
  })

  it('should return error when sender email is missing', async () => {
    const mailSender = new MailSender(
      null as any,
      { address: 'recipient@example.com', name: 'Recipient' },
      'Test Subject',
      '<p>Test message</p>'
    )

    const result = await mailSender.sendMail()

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toBe('Sender email (from) is required.')
  })

  it('should return error when recipient email is missing', async () => {
    const mailSender = new MailSender(
      { address: 'sender@example.com', name: 'Sender' },
      null as any,
      'Test Subject',
      '<p>Test message</p>'
    )

    const result = await mailSender.sendMail()

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toBe('Recipient email (to) is required.')
  })

  it('should return error when message is missing', async () => {
    const mailSender = new MailSender(
      { address: 'sender@example.com', name: 'Sender' },
      { address: 'recipient@example.com', name: 'Recipient' },
      'Test Subject',
      ''
    )

    const result = await mailSender.sendMail()

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toBe('A email message is required.')
  })

  describe('SMTP config', () => {
    it('should set secure to true when port is 465', async () => {
      process.env.MAIL_PORT = '465'
      const mailSender = new MailSender(
        { address: 'sender@example.com', name: 'Sender' },
        { address: 'recipient@example.com', name: 'Recipient' },
        'Test Subject',
        '<p>Hi</p>'
      )

      await mailSender.sendMail()

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ secure: true, port: 465 })
      )
      delete process.env.MAIL_PORT
    })

    it('should set secure to false when port is not 465', async () => {
      process.env.MAIL_PORT = '587'
      const mailSender = new MailSender(
        { address: 'sender@example.com', name: 'Sender' },
        { address: 'recipient@example.com', name: 'Recipient' },
        'Test Subject',
        '<p>Hi</p>'
      )

      await mailSender.sendMail()

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ secure: false, port: 587 })
      )
      delete process.env.MAIL_PORT
    })
  })
})
