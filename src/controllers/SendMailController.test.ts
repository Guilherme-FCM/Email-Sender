import { Request, Response } from 'express'
import SendMailController from './SendMailController'
import SendMailService from '../services/SendMailService'
import { SQSEmailQueue } from '../queues/SQSEmailQueue'
import { IEmailQueue } from '../queues/IEmailQueue'

jest.mock('../services/SendMailService')
jest.mock('../queues/SQSEmailQueue')

const mockResponse = () => {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const makeMockQueue = (overrides: Partial<IEmailQueue> = {}): IEmailQueue => ({
  enqueue: jest.fn().mockResolvedValue({ messageId: 'sqs-001', correlationId: 'corr-001' }),
  ...overrides,
})

describe('SendMailController', () => {
  let mockListAll: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockListAll = jest.fn()
    ;(SendMailService as jest.MockedClass<typeof SendMailService>).mockImplementation(() => ({
      execute: jest.fn(),
      listAll: mockListAll,
    } as any))
  })

  describe('handle', () => {
    it('should return 202 with messageId and correlationId on success', async () => {
      const queue = makeMockQueue()
      SendMailController.setQueue(queue)
      const req = {
        body: { from: 'a@a.com', to: 'b@b.com', subject: 'Hi', message: '<p>Hi</p>' },
        headers: { 'x-correlation-id': 'client-corr-001' },
      } as unknown as Request
      const res = mockResponse()

      await SendMailController.handle(req, res)

      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.json).toHaveBeenCalledWith({
        status: 'queued',
        messageId: 'sqs-001',
        correlationId: 'corr-001',
      })
    })

    it('should pass X-Correlation-ID header to queue.enqueue', async () => {
      const queue = makeMockQueue()
      SendMailController.setQueue(queue)
      const req = {
        body: { from: 'a@a.com', to: 'b@b.com', subject: 'Hi', message: '<p>Hi</p>' },
        headers: { 'x-correlation-id': 'my-trace-id' },
      } as unknown as Request
      const res = mockResponse()

      await SendMailController.handle(req, res)

      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Hi' }),
        'my-trace-id'
      )
    })

    it('should auto-generate correlationId when X-Correlation-ID header is absent', async () => {
      const queue = makeMockQueue()
      SendMailController.setQueue(queue)
      const req = {
        body: { from: 'a@a.com', to: 'b@b.com', subject: 'Hi', message: '<p>Hi</p>' },
        headers: {},
      } as unknown as Request
      const res = mockResponse()

      await SendMailController.handle(req, res)

      const [, passedCorrelationId] = (queue.enqueue as jest.Mock).mock.calls[0]
      expect(typeof passedCorrelationId).toBe('string')
      expect(passedCorrelationId.length).toBeGreaterThan(0)
    })

    it('should pass all email fields to queue.enqueue', async () => {
      const queue = makeMockQueue()
      SendMailController.setQueue(queue)
      const body = {
        from: 'a@a.com',
        to: 'b@b.com',
        subject: 'Subject',
        message: '<p>Msg</p>',
        text: 'Msg',
      }
      const req = {
        body,
        headers: { 'x-correlation-id': 'corr-x' },
      } as unknown as Request
      const res = mockResponse()

      await SendMailController.handle(req, res)

      expect(queue.enqueue).toHaveBeenCalledWith(body, 'corr-x')
    })

    it('should return 500 when queue.enqueue throws', async () => {
      const queue = makeMockQueue({
        enqueue: jest.fn().mockRejectedValue(new Error('SQS unavailable')),
      })
      SendMailController.setQueue(queue)
      const req = {
        body: { from: 'a@a.com', to: 'b@b.com', subject: 'Hi', message: '<p>Hi</p>' },
        headers: {},
      } as unknown as Request
      const res = mockResponse()

      await SendMailController.handle(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'SQS unavailable' })
    })

    afterEach(() => {
      SendMailController.setQueue(new SQSEmailQueue())
    })
  })

  describe('list', () => {
    it('should return all emails as JSON', async () => {
      mockListAll.mockResolvedValue({ Items: [{ id: '1', from: 'a@a.com' }] })
      const req = {} as Request
      const res = mockResponse()

      await SendMailController.list(req, res)

      expect(mockListAll).toHaveBeenCalledTimes(1)
      expect(res.json).toHaveBeenCalledWith({ Items: [{ id: '1', from: 'a@a.com' }] })
    })
  })
})
