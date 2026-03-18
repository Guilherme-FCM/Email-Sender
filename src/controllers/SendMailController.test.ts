import { Request, Response } from 'express'
import SendMailController from './SendMailController'
import SendMailService from '../services/SendMailService'

jest.mock('../services/SendMailService')

const mockResponse = () => {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('SendMailController', () => {
  let mockExecute: jest.Mock
  let mockListAll: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockExecute = jest.fn()
    mockListAll = jest.fn()
    ;(SendMailService as jest.MockedClass<typeof SendMailService>).mockImplementation(() => ({
      execute: mockExecute,
      listAll: mockListAll,
    } as any))
  })

  describe('handle', () => {
    it('should return result as JSON on success', async () => {
      mockExecute.mockResolvedValue({ messageId: '123' })
      const req = { body: { from: 'a@a.com', to: 'b@b.com', subject: 'Hi', message: '<p>Hi</p>' } } as Request
      const res = mockResponse()

      await SendMailController.handle(req, res)

      expect(mockExecute).toHaveBeenCalledWith(req.body)
      expect(res.json).toHaveBeenCalledWith({ messageId: '123' })
    })

    it('should return 400 when result is an Error', async () => {
      mockExecute.mockResolvedValue(new Error('Sender email (from) is required.'))
      const req = { body: {} } as Request
      const res = mockResponse()

      await SendMailController.handle(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Sender email (from) is required.' })
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
