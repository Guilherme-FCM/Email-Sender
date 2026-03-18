import DynamoDBConnection from './DynamoDBConnection'
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

jest.mock('@aws-sdk/client-dynamodb')
jest.mock('@aws-sdk/lib-dynamodb')

describe('DynamoDBConnection', () => {
  let mockSend: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation()
    ;(DynamoDBConnection as any).instance = null
    ;(DynamoDBConnection as any).client = null

    mockSend = jest.fn().mockResolvedValue({})
    ;(DynamoDBClient as jest.Mock).mockImplementation(() => ({ send: mockSend }))
    ;(DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({ send: mockSend })

    process.env.AWS_ACCESS_KEY_ID = 'test-key'
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret'
    process.env.DYNAMODB_TABLE = 'test-table'
  })

  afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.AWS_ACCESS_KEY_ID
    delete process.env.AWS_SECRET_ACCESS_KEY
    delete process.env.DYNAMODB_TABLE
  })

  describe('getInstance', () => {
    it('should return a DynamoDBDocumentClient instance', async () => {
      const instance = await DynamoDBConnection.getInstance()
      expect(instance).toBeDefined()
    })

    it('should return the same instance on multiple calls (singleton)', async () => {
      const instance1 = await DynamoDBConnection.getInstance()
      const instance2 = await DynamoDBConnection.getInstance()
      expect(instance1).toBe(instance2)
      expect(DynamoDBClient).toHaveBeenCalledTimes(1)
    })

    it('should throw when AWS_ACCESS_KEY_ID is missing', async () => {
      delete process.env.AWS_ACCESS_KEY_ID
      await expect(DynamoDBConnection.getInstance()).rejects.toThrow('AWS_ACCESS_KEY_ID is required.')
    })

    it('should throw when AWS_SECRET_ACCESS_KEY is missing', async () => {
      delete process.env.AWS_SECRET_ACCESS_KEY
      await expect(DynamoDBConnection.getInstance()).rejects.toThrow('AWS_SECRET_ACCESS_KEY is required.')
    })
  })

  describe('ensureTableExists', () => {
    it('should not create table when it already exists', async () => {
      mockSend.mockResolvedValue({ Table: { TableName: 'test-table' } })

      await DynamoDBConnection.getInstance()

      const createCalls = mockSend.mock.calls.filter(([cmd]) => cmd instanceof CreateTableCommand)
      expect(createCalls).toHaveLength(0)
    })

    it('should create table when ResourceNotFoundException is thrown', async () => {
      const notFoundError = new Error('Table not found')
      notFoundError.name = 'ResourceNotFoundException'
      mockSend
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({})

      await DynamoDBConnection.getInstance()

      expect(mockSend).toHaveBeenCalledTimes(2)
      const createCalls = mockSend.mock.calls.filter(([cmd]) => cmd instanceof CreateTableCommand)
      expect(createCalls).toHaveLength(1)
    })

    it('should rethrow non-ResourceNotFoundException errors', async () => {
      const unexpectedError = new Error('Access denied')
      unexpectedError.name = 'AccessDeniedException'
      mockSend.mockRejectedValueOnce(unexpectedError)

      await expect(DynamoDBConnection.getInstance()).rejects.toThrow('Access denied')
    })
  })

  describe('getTableName', () => {
    it('should return table name from env var', async () => {
      await DynamoDBConnection.getInstance()
      expect(DynamoDBConnection.getTableName()).toBe('test-table')
    })
  })
})
