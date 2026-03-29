import { Request, Response } from 'express'
import crypto from 'crypto'
import { IEmailQueue } from '../queues/IEmailQueue'
import { SQSEmailQueue } from '../queues/SQSEmailQueue'
import SendMailService from '../services/SendMailService'

export default class SendMailController {
  private static queue: IEmailQueue = new SQSEmailQueue()

  static setQueue(queue: IEmailQueue): void {
    SendMailController.queue = queue
  }

  public static async handle(request: Request, response: Response): Promise<Response> {
    try {
      const { from, to, subject, message, text } = request.body
      const correlationId =
        (request.headers['x-correlation-id'] as string) || crypto.randomUUID()

      const result = await SendMailController.queue.enqueue(
        { from, to, subject, message, text },
        correlationId
      )

      return response.status(202).json({ status: 'queued', ...result })
    } catch (error) {
      return response
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Failed to queue email' })
    }
  }

  public static async list(request: Request, response: Response): Promise<Response> {
    const service = new SendMailService()
    const result = await service.listAll()
    return response.json(result)
  }
}
