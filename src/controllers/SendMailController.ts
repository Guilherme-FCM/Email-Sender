import { Request, Response } from 'express'
import MailSender from '../services/MailSender'

export default class SendMailController {
  public static async handle(request: Request, response: Response): Promise<Response> {
    const { from, to, subject, message, text } = request.body

    const mailSender = new MailSender(from, to, subject, message, text)
    const result = await mailSender.sendMail()

    if (result instanceof Error) {
      return response.status(400).json({ error: result.message })
    }

    return response.json(result)
  }
}
