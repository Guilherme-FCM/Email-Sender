import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { SQSEmailQueue } from './SQSEmailQueue'
import { QueueEmailRequest } from './IEmailQueue'

jest.mock('@aws-sdk/client-sqs')

const mockSend = jest.fn()

describe('SQSEmailQueue', () => {
  let queue: SQSEmailQueue
  const queueUrl = 'http://localhost:4566/000000000000/emails-queue'

  const emailData: QueueEmailRequest = {
    from: { address: 'sender@example.com', name: 'Sender' },
    to: { address: 'recipient@example.com', name: 'Recipient' },
    subject: 'Hello',
    message: '<p>Hi</p>',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(SQSClient as jest.MockedClass<typeof SQSClient>).mockImplementation(() => ({
      send: mockSend,
    } as any))
    process.env.SQS_QUEUE_URL = queueUrl
    queue = new SQSEmailQueue()
  })

  afterEach(() => {
    delete process.env.SQS_QUEUE_URL
  })

  describe('enqueue', () => {
    it('should send message to SQS and return messageId and correlationId', async () => {
      mockSend.mockResolvedValue({ MessageId: 'sqs-msg-001' })

      const result = await queue.enqueue(emailData, 'corr-001')

      expect(result).toEqual({ messageId: 'sqs-msg-001', correlationId: 'corr-001' })
    })

    it('should call SQS SendMessageCommand with correct QueueUrl', async () => {
      mockSend.mockResolvedValue({ MessageId: 'sqs-msg-002' })

      await queue.enqueue(emailData, 'corr-002')

      const [[command]] = mockSend.mock.calls
      expect(command).toBeInstanceOf(SendMessageCommand)
      expect((SendMessageCommand as jest.MockedClass<typeof SendMessageCommand>).mock.calls[0][0].QueueUrl).toBe(queueUrl)
    })

    it('should serialize email data as MessageBody JSON', async () => {
      mockSend.mockResolvedValue({ MessageId: 'sqs-msg-003' })

      await queue.enqueue(emailData, 'corr-003')

      const input = (SendMessageCommand as jest.MockedClass<typeof SendMessageCommand>).mock.calls[0][0]
      expect(JSON.parse(input.MessageBody!)).toMatchObject({
        subject: 'Hello',
        message: '<p>Hi</p>',
      })
    })

    it('should attach CorrelationId as MessageAttribute', async () => {
      mockSend.mockResolvedValue({ MessageId: 'sqs-msg-004' })

      await queue.enqueue(emailData, 'corr-004')

      const input = (SendMessageCommand as jest.MockedClass<typeof SendMessageCommand>).mock.calls[0][0]
      expect(input.MessageAttributes?.CorrelationId).toEqual({
        DataType: 'String',
        StringValue: 'corr-004',
      })
    })

    it('should include optional text field in MessageBody when provided', async () => {
      mockSend.mockResolvedValue({ MessageId: 'sqs-msg-005' })
      const dataWithText = { ...emailData, text: 'Plain text fallback' }

      await queue.enqueue(dataWithText, 'corr-005')

      const input = (SendMessageCommand as jest.MockedClass<typeof SendMessageCommand>).mock.calls[0][0]
      expect(JSON.parse(input.MessageBody!)).toMatchObject({ text: 'Plain text fallback' })
    })

    it('should throw when SQS returns no MessageId', async () => {
      mockSend.mockResolvedValue({})

      await expect(queue.enqueue(emailData, 'corr-006')).rejects.toThrow(
        'SQS did not return a MessageId'
      )
    })

    it('should propagate SQS client errors', async () => {
      mockSend.mockRejectedValue(new Error('SQS unavailable'))

      await expect(queue.enqueue(emailData, 'corr-007')).rejects.toThrow('SQS unavailable')
    })
  })
})
