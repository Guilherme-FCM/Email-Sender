import { DynamoDBEmailRepository } from './DynamoDBEmailRepository'
import Email from '../entities/Email'
import DynamoDB from '../database/DynamoDBConnection'
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

jest.mock('../database/DynamoDBConnection')

describe('DynamoDBEmailRepository', () => {
  let repository: DynamoDBEmailRepository
  let mockSend: jest.Mock

  beforeEach(() => {
    repository = new DynamoDBEmailRepository()
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
      const error = new Error('Conditional check failed')
      error.name = 'ConditionalCheckFailedException'
      mockSend.mockRejectedValue(error)

      await expect(
        repository.save(new Email('a@a.com', 'b@b.com', 'Sub', '<p>Msg</p>'))
      ).resolves.not.toThrow()
    })

    it('should rethrow non-conditional errors', async () => {
      const error = new Error('DynamoDB unavailable')
      mockSend.mockRejectedValue(error)

      await expect(
        repository.save(new Email('a@a.com', 'b@b.com', 'Sub', '<p>Msg</p>'))
      ).rejects.toThrow('DynamoDB unavailable')
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
      expect(result).toEqual(mockItems)
    })

    it('should return empty array when no items exist', async () => {
      mockSend.mockResolvedValue({})
      const result = await repository.all()
      expect(result).toEqual([])
    })
  })
})
