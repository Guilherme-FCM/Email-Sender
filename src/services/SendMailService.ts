import { Address } from 'nodemailer/lib/mailer'
import MailSender from './MailSender'
import { EmailRepository } from '../repositories/EmailRepository'
import Email from '../entities/Email'

type SendMailRequest = {
  from: Address
  to: Address
  subject: string
  message: string
  text?: string
}

type EmailCache = {
  timestamp: number
}

export default class SendMailService {
  private static cache: Map<string, EmailCache> = new Map()
  private static readonly CACHE_TTL = 5 * 60 * 1000
  private repository: EmailRepository

  constructor() {
    this.repository = new EmailRepository()
  }

  private getEmailKey(data: SendMailRequest): string {
    const from = typeof data.from === 'string' ? data.from : data.from.address
    const to = typeof data.to === 'string' ? data.to : data.to.address
    return `${from}|${to}|${data.subject}`
  }

  private isDuplicate(key: string): boolean {
    const cached = SendMailService.cache.get(key)
    if (!cached) return false
    
    const now = Date.now()
    if (now - cached.timestamp > SendMailService.CACHE_TTL) {
      SendMailService.cache.delete(key)
      return false
    }
    return true
  }

  async execute(data: SendMailRequest) {
    try {
      const key = this.getEmailKey(data)
      
      if (this.isDuplicate(key)) {
        return { skipped: true, reason: 'Duplicate email within 5 minutes' }
      }

      const mailSender = new MailSender(
        data.from,
        data.to,
        data.subject,
        data.message,
        data.text
      )

      const result = await mailSender.sendMail()
      SendMailService.cache.set(key, { timestamp: Date.now() })
      
      const from = typeof data.from === 'string' ? data.from : data.from.address
      const to = typeof data.to === 'string' ? data.to : data.to.address
      const email = new Email(from, to, data.subject, data.message, data.text)
      await this.repository.save(email)
      
      return result
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' }
    }
  }

  async listAll() {
    return await this.repository.all()
  }
}
