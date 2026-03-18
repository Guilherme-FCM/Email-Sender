import { Request, Response } from 'express'
import HealthController from './HealthController'
import RedisConnection from '../database/RedisConnection'
import DynamoDBConnection from '../database/DynamoDBConnection'

jest.mock('../database/RedisConnection')
jest.mock('../database/DynamoDBConnection')

const mockResponse = () => {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('HealthController', () => {
  const req = {} as Request

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('health', () => {
    it('should return status ok with timestamp', async () => {
      const res = mockResponse()

      await HealthController.health(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ok', timestamp: expect.any(String) })
      )
    })
  })

  describe('ready', () => {
    it('should return 200 with status ready when all checks pass', async () => {
      ;(RedisConnection.healthCheck as jest.Mock).mockResolvedValue(true)
      ;(DynamoDBConnection.getInstance as jest.Mock).mockResolvedValue({})
      const res = mockResponse()

      await HealthController.ready(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          checks: { redis: true, dynamodb: true },
        })
      )
    })

    it('should return 503 when Redis is unhealthy', async () => {
      ;(RedisConnection.healthCheck as jest.Mock).mockResolvedValue(false)
      ;(DynamoDBConnection.getInstance as jest.Mock).mockResolvedValue({})
      const res = mockResponse()

      await HealthController.ready(req, res)

      expect(res.status).toHaveBeenCalledWith(503)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          checks: { redis: false, dynamodb: true },
        })
      )
    })

    it('should return 503 when DynamoDB is unavailable', async () => {
      ;(RedisConnection.healthCheck as jest.Mock).mockResolvedValue(true)
      ;(DynamoDBConnection.getInstance as jest.Mock).mockRejectedValue(new Error('DynamoDB unavailable'))
      const res = mockResponse()

      await HealthController.ready(req, res)

      expect(res.status).toHaveBeenCalledWith(503)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          checks: { redis: true, dynamodb: false },
        })
      )
    })

    it('should return 503 when both checks fail', async () => {
      ;(RedisConnection.healthCheck as jest.Mock).mockRejectedValue(new Error('Redis down'))
      ;(DynamoDBConnection.getInstance as jest.Mock).mockRejectedValue(new Error('DynamoDB down'))
      const res = mockResponse()

      await HealthController.ready(req, res)

      expect(res.status).toHaveBeenCalledWith(503)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          checks: { redis: false, dynamodb: false },
        })
      )
    })
  })
})
