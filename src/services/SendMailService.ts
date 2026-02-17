import { Address } from 'nodemailer/lib/mailer'
import MailSender from './MailSender'

type SendMailRequest = {
  from: Address
  to: Address
  subject: string
  message: string
  text?: string
}

export default class SendMailService {
  async execute(data: SendMailRequest) {
    const mailSender = new MailSender(
      data.from,
      data.to,
      data.subject,
      data.message,
      data.text
    )

    return await mailSender.sendMail()
  }
}
