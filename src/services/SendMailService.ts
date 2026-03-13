import { Address } from 'nodemailer/lib/mailer'
import MailSender from './MailSender'
import { EmailRepository } from '../repositories/EmailRepository'
import Email from '../entities/Email'
import { generatePayloadHash } from '../utils/hashGenerator'

type SendMailRequest = {
  from: Address
  to: Address
  subject: string
  message: string
  text?: string
}

type EmailCache = {
  timestamp: number
  result?: any
}

export default class SendMailService {
  private static cache: Map<string, EmailCache> = new Map()
  private static readonly CACHE_TTL = 5 * 60 * 1000
  private repository: EmailRepository

  constructor() {
    this.repository = new EmailRepository()
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
      const key = generatePayloadHash(data)
      
      if (this.isDuplicate(key)) {
        const cached = SendMailService.cache.get(key)
        return cached?.result || { status: 'duplicate', message: 'Request already processed' }
      }

      const mailSender = new MailSender(
        data.from,
        data.to,
        data.subject,
        data.message,
        data.text
      )

      const result = await mailSender.sendMail()
      SendMailService.cache.set(key, { timestamp: Date.now(), result })
      
      const from = typeof data.from === 'string' ? data.from : data.from.address
      const to = typeof data.to === 'string' ? data.to : data.to.address
      const email = new Email(from, to, data.subject, data.message, data.text, key)
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
