import request from 'supertest'
import express from 'express'
import routes from '../../src/routes'
import { IEmailQueue } from '../../src/queues/IEmailQueue'
import SendMailController from '../../src/controllers/SendMailController'
import SendMailUseCase from '../../src/services/SendMailUseCase'
import RedisConnection from '../../src/database/RedisConnection'
import DynamoDBConnection from '../../src/database/DynamoDBConnection'

jest.mock('../../src/services/SendMailUseCase')
jest.mock('../../src/database/RedisConnection')
jest.mock('../../src/database/DynamoDBConnection')

const makeMockQueue = (overrides: Partial<IEmailQueue> = {}): IEmailQueue => ({
  enqueue: jest.fn().mockResolvedValue({ messageId: 'sqs-feat-001', correlationId: 'corr-feat-001' }),
  ...overrides,
})

const app = express()
app.use(express.json())
app.use(routes)

describe('Feature: Email API', () => {
  let mockListAll: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation()

    mockListAll = jest.fn().mockResolvedValue([{ id: '1', from: 'a@a.com' }])
    ;(SendMailUseCase as jest.MockedClass<typeof SendMailUseCase>).mockImplementation(() => ({
      execute: jest.fn(),
      listAll: mockListAll,
    } as any))

    ;(RedisConnection.healthCheck as jest.Mock).mockResolvedValue(true)
    ;(DynamoDBConnection.getInstance as jest.Mock).mockResolvedValue({})

    SendMailController.setQueue(makeMockQueue())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('POST /send-email', () => {
    it('should return 202 with queued status, messageId and correlationId', async () => {
      const res = await request(app)
        .post('/send-email')
        .set('X-Correlation-ID', 'test-corr-001')
        .send({ from: 'a@a.com', to: 'b@b.com', subject: 'Hi', message: '<p>Hi</p>' })

      expect(res.status).toBe(202)
      expect(res.body).toMatchObject({
        status: 'queued',
        messageId: 'sqs-feat-001',
        correlationId: 'corr-feat-001',
      })
    })

    it('should auto-generate correlationId when header is absent', async () => {
      const res = await request(app)
        .post('/send-email')
        .send({ from: 'a@a.com', to: 'b@b.com', subject: 'Hi', message: '<p>Hi</p>' })

      expect(res.status).toBe(202)
      expect(res.body.status).toBe('queued')
    })

    it('should return 500 when queue throws', async () => {
      SendMailController.setQueue(makeMockQueue({
        enqueue: jest.fn().mockRejectedValue(new Error('SQS down')),
      }))

      const res = await request(app)
        .post('/send-email')
        .send({ from: 'a@a.com', to: 'b@b.com', subject: 'Hi', message: '<p>Hi</p>' })

      expect(res.status).toBe(500)
      expect(res.body).toMatchObject({ error: 'SQS down' })
    })
  })

  describe('GET /emails', () => {
    it('should return 200 with items array', async () => {
      const res = await request(app).get('/emails')

      expect(res.status).toBe(200)
      expect(res.body).toEqual([{ id: '1', from: 'a@a.com' }])
    })
  })

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/health')

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ status: 'ok' })
    })
  })

  describe('GET /ready', () => {
    it('should return 200 when all dependencies are healthy', async () => {
      const res = await request(app).get('/ready')

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ status: 'ready' })
    })

    it('should return 503 when Redis is unhealthy', async () => {
      ;(RedisConnection.healthCheck as jest.Mock).mockResolvedValue(false)

      const res = await request(app).get('/ready')

      expect(res.status).toBe(503)
      expect(res.body).toMatchObject({ status: 'not_ready' })
    })

    it('should return 503 when DynamoDB is unavailable', async () => {
      ;(DynamoDBConnection.getInstance as jest.Mock).mockRejectedValue(new Error('DynamoDB down'))

      const res = await request(app).get('/ready')

      expect(res.status).toBe(503)
      expect(res.body).toMatchObject({ status: 'not_ready' })
    })
  })
})
