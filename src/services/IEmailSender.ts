import { Address } from 'nodemailer/lib/mailer'

export type SendEmailData = {
  from: Address
  to: Address
  subject: string
  message: string
  text?: string
}

export interface IEmailSender {
  send(data: SendEmailData): Promise<{ messageId: string }>
}
