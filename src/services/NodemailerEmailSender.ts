import Mail, { Address } from 'nodemailer/lib/mailer'
import nodemailer from 'nodemailer'
import { IEmailSender, SendEmailData } from './IEmailSender'

export class NodemailerEmailSender implements IEmailSender {
  async send(data: SendEmailData): Promise<{ messageId: string }> {
    const validationError = this.validateFields(data)
    if (validationError) throw validationError

    const transporter = nodemailer.createTransport(this.getMailServerConfig())
    return transporter.sendMail(this.getMailOptions(data))
  }

  private validateFields(data: SendEmailData): Error | null {
    if (!data.from) return new Error('Sender email (from) is required.')
    if (!data.to) return new Error('Recipient email (to) is required.')
    if (!data.message) return new Error('A email message is required.')
    return null
  }

  private getMailServerConfig() {
    return {
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    }
  }

  private getMailOptions(data: SendEmailData): Mail.Options {
    return {
      from: data.from,
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.message,
    }
  }
}
