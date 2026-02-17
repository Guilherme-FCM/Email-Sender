import { Request, Response } from 'express'
import SendMailService from '../services/SendMailService'

export default class SendMailController {
  public static async handle(request: Request, response: Response): Promise<Response> {
    const { from, to, subject, message, text } = request.body
    
    const service = new SendMailService();
    const result = await service.execute({ from, to, subject, message, text})

    if (result instanceof Error) {
      return response.status(400).json({ error: result.message })
    }

    return response.json(result)
  }
}
