import { NodemailerEmailSender } from './NodemailerEmailSender'
import nodemailer from 'nodemailer'

jest.mock('nodemailer')

describe('NodemailerEmailSender', () => {
  let sender: NodemailerEmailSender
  let mockSendMail: jest.Mock
  let mockCreateTransport: jest.Mock

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' })
    mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail })
    ;(nodemailer.createTransport as jest.Mock) = mockCreateTransport
    sender = new NodemailerEmailSender()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should send email successfully', async () => {
    const result = await sender.send({
      from: { address: 'sender@example.com', name: 'Sender' },
      to: { address: 'recipient@example.com', name: 'Recipient' },
      subject: 'Test Subject',
      message: '<p>Test message</p>',
    })

    expect(mockCreateTransport).toHaveBeenCalled()
    expect(mockSendMail).toHaveBeenCalled()
    expect(result).toEqual({ messageId: '123' })
  })

  it('should throw error when sender email is missing', async () => {
    await expect(
      sender.send({
        from: null as any,
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Test message</p>',
      })
    ).rejects.toThrow('Sender email (from) is required.')
  })

  it('should throw error when recipient email is missing', async () => {
    await expect(
      sender.send({
        from: { address: 'sender@example.com', name: 'Sender' },
        to: null as any,
        subject: 'Test Subject',
        message: '<p>Test message</p>',
      })
    ).rejects.toThrow('Recipient email (to) is required.')
  })

  it('should throw error when message is missing', async () => {
    await expect(
      sender.send({
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '',
      })
    ).rejects.toThrow('A email message is required.')
  })

  describe('SMTP config', () => {
    it('should set secure to true when port is 465', async () => {
      process.env.MAIL_PORT = '465'

      await sender.send({
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Hi</p>',
      })

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ secure: true, port: 465 })
      )
      delete process.env.MAIL_PORT
    })

    it('should set secure to false when port is not 465', async () => {
      process.env.MAIL_PORT = '587'

      await sender.send({
        from: { address: 'sender@example.com', name: 'Sender' },
        to: { address: 'recipient@example.com', name: 'Recipient' },
        subject: 'Test Subject',
        message: '<p>Hi</p>',
      })

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ secure: false, port: 587 })
      )
      delete process.env.MAIL_PORT
    })
  })
})
