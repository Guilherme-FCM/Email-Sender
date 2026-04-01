import { EmailRepository } from './EmailRepository'
import Email from '../entities/Email'
import DynamoDB from '../database/DynamoDBConnection'
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

jest.mock('../database/DynamoDBConnection')

describe('EmailRepository', () => {
  let repository: EmailRepository
  let mockSend: jest.Mock

  beforeEach(() => {
    repository = new EmailRepository()
    mockSend = jest.fn()
    ;(DynamoDB.getInstance as jest.Mock).mockResolvedValue({ send: mockSend })
    ;(DynamoDB.getTableName as jest.Mock).mockReturnValue('test-table')
    jest.clearAllMocks()
  })

  describe('save', () => {
    it('should save email with idempotency key to DynamoDB', async () => {
      mockSend.mockResolvedValue({})
      
      const email = new Email(
        'sender@example.com',
        'recipient@example.com',
        'Test Subject',
        '<p>Test Message</p>',
        'Test Message',
        'test-key-123'
      )

      await repository.save(email)

      expect(mockSend).toHaveBeenCalledTimes(1)
      const callArg = mockSend.mock.calls[0][0]
      expect(callArg).toBeInstanceOf(PutCommand)
      expect(callArg.input.Item.idempotencyKey).toBe('test-key-123')
      expect(callArg.input.Item.from).toBe('sender@example.com')
      expect(callArg.input.Item.to).toBe('recipient@example.com')
    })

    it('should silently ignore ConditionalCheckFailedException', async () => {
      const error = new Error('Duplicate')
      error.name = 'ConditionalCheckFailedException'
      mockSend.mockRejectedValue(error)

      const email = new Email('a@a.com', 'b@b.com', 'S', 'M')
      await expect(repository.save(email)).resolves.not.toThrow()
    })

    it('should rethrow non-ConditionalCheckFailedException errors', async () => {
      const error = new Error('DynamoDB unavailable')
      error.name = 'ProvisionedThroughputExceededException'
      mockSend.mockRejectedValue(error)

      const email = new Email('a@a.com', 'b@b.com', 'S', 'M')
      await expect(repository.save(email)).rejects.toThrow('DynamoDB unavailable')
    })
  })

  describe('all', () => {
    it('should scan and return all emails from DynamoDB', async () => {
      const mockItems = [{ id: '1', from: 'sender@example.com' }]
      mockSend.mockResolvedValue({ Items: mockItems })

      const result = await repository.all()

      expect(mockSend).toHaveBeenCalledTimes(1)
      const callArg = mockSend.mock.calls[0][0]
      expect(callArg).toBeInstanceOf(ScanCommand)
      expect(result.Items).toEqual(mockItems)
    })
  })
})
