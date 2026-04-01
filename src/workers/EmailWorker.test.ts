import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'
import { EmailWorker } from './EmailWorker'
import SendMailService from '../services/SendMailService'

jest.mock('@aws-sdk/client-sqs')
jest.mock('../services/SendMailService')

const mockSend = jest.fn()
const mockExecute = jest.fn()

const makeMessage = (id: string, body: object, receiptHandle = 'handle-' + id) => ({
  MessageId: id,
  ReceiptHandle: receiptHandle,
  Body: JSON.stringify(body),
  MessageAttributes: {
    CorrelationId: { DataType: 'String', StringValue: 'corr-' + id },
  },
})

const emailPayload = {
  from: { address: 'sender@example.com', name: 'Sender' },
  to: { address: 'recipient@example.com', name: 'Recipient' },
  subject: 'Hello',
  message: '<p>Hi</p>',
}

describe('EmailWorker', () => {
  let worker: EmailWorker

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation()
    jest.spyOn(console, 'log').mockImplementation()

    ;(SQSClient as jest.MockedClass<typeof SQSClient>).mockImplementation(() => ({
      send: mockSend,
    } as any))
    ;(SendMailService as jest.MockedClass<typeof SendMailService>).mockImplementation(() => ({
      execute: mockExecute,
    } as any))

    process.env.SQS_QUEUE_URL = 'http://localhost:4566/000000000000/emails-queue'
    worker = new EmailWorker()
  })

  afterEach(() => {
    worker.stop()
    delete process.env.SQS_QUEUE_URL
    jest.restoreAllMocks()
  })

  describe('processMessages', () => {
    it('should call SendMailService.execute with parsed message body', async () => {
      mockSend
        .mockResolvedValueOnce({ Messages: [makeMessage('1', emailPayload)] })
        .mockResolvedValue({ Messages: [] })
      mockExecute.mockResolvedValue({ messageId: 'smtp-001' })

      await worker.processMessages()

      expect(mockExecute).toHaveBeenCalledWith(emailPayload)
    })

    it('should delete message from SQS after successful processing', async () => {
      mockSend
        .mockResolvedValueOnce({ Messages: [makeMessage('2', emailPayload)] })
        .mockResolvedValue({ Messages: [] })
      mockExecute.mockResolvedValue({ messageId: 'smtp-002' })

      await worker.processMessages()

      const deleteCalls = (DeleteMessageCommand as jest.MockedClass<typeof DeleteMessageCommand>).mock.calls
      expect(deleteCalls).toHaveLength(1)
      expect(deleteCalls[0][0].ReceiptHandle).toBe('handle-2')
    })

    it('should process multiple messages in a single batch', async () => {
      mockSend
        .mockResolvedValueOnce({
          Messages: [makeMessage('3', emailPayload), makeMessage('4', emailPayload)],
        })
        .mockResolvedValue({ Messages: [] })
      mockExecute.mockResolvedValue({ messageId: 'smtp-ok' })

      await worker.processMessages()

      expect(mockExecute).toHaveBeenCalledTimes(2)
    })

    it('should NOT delete message when SendMailService throws', async () => {
      mockSend
        .mockResolvedValueOnce({ Messages: [makeMessage('5', emailPayload)] })
        .mockResolvedValue({ Messages: [] })
      mockExecute.mockRejectedValue(new Error('SMTP failure'))

      await worker.processMessages()

      const deleteCalls = (DeleteMessageCommand as jest.MockedClass<typeof DeleteMessageCommand>).mock.calls
      expect(deleteCalls).toHaveLength(0)
    })

    it('should log error and continue when one message fails', async () => {
      mockSend
        .mockResolvedValueOnce({
          Messages: [makeMessage('6', emailPayload), makeMessage('7', emailPayload)],
        })
        .mockResolvedValue({ Messages: [] })
      mockExecute
        .mockRejectedValueOnce(new Error('SMTP failure'))
        .mockResolvedValueOnce({ messageId: 'smtp-ok' })

      await worker.processMessages()

      expect(mockExecute).toHaveBeenCalledTimes(2)
      expect(console.error).toHaveBeenCalled()
    })

    it('should use long polling with WaitTimeSeconds 20', async () => {
      mockSend.mockResolvedValue({ Messages: [] })

      await worker.processMessages()

      const [[input]] = (ReceiveMessageCommand as jest.MockedClass<typeof ReceiveMessageCommand>).mock.calls
      expect(input.WaitTimeSeconds).toBe(20)
    })

    it('should request up to 10 messages per poll', async () => {
      mockSend.mockResolvedValue({ Messages: [] })

      await worker.processMessages()

      const [[input]] = (ReceiveMessageCommand as jest.MockedClass<typeof ReceiveMessageCommand>).mock.calls
      expect(input.MaxNumberOfMessages).toBe(10)
    })

    it('should handle empty Messages array gracefully', async () => {
      mockSend.mockResolvedValue({ Messages: [] })

      await expect(worker.processMessages()).resolves.not.toThrow()
      expect(mockExecute).not.toHaveBeenCalled()
    })

    it('should handle undefined Messages response gracefully', async () => {
      mockSend.mockResolvedValue({})

      await expect(worker.processMessages()).resolves.not.toThrow()
      expect(mockExecute).not.toHaveBeenCalled()
    })
  })

  describe('stop', () => {
    it('should set running to false', () => {
      worker.stop()
      expect(worker.isRunning()).toBe(false)
    })
  })

  describe('constructor', () => {
    it('should configure SQS client with custom endpoint when SQS_ENDPOINT is set', () => {
      process.env.SQS_ENDPOINT = 'http://localhost:4566'
      const w = new EmailWorker()
      expect(w).toBeDefined()
      delete process.env.SQS_ENDPOINT
    })

    it('should configure SQS client without endpoint when SQS_ENDPOINT is not set', () => {
      delete process.env.SQS_ENDPOINT
      const w = new EmailWorker()
      expect(w).toBeDefined()
    })
  })
})
