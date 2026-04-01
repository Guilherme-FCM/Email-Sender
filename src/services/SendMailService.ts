import { Address } from 'nodemailer/lib/mailer'
import MailSender from './MailSender'
import { EmailRepository } from '../repositories/EmailRepository'
import Email from '../entities/Email'
import { generatePayloadHash } from '../utils/hashGenerator'
import RedisConnection from '../database/RedisConnection'
import Lock from '../utils/Lock'

type SendMailRequest = {
  from: Address
  to: Address
  subject: string
  message: string
  text?: string
}

export default class SendMailService {
  private static readonly CACHE_TTL = Number(process.env.IDEMPOTENCY_TTL) || 300
  private static readonly REDIS_REQUIRED = process.env.REDIS_REQUIRED !== 'false'
  private repository: EmailRepository

  constructor() {
    this.repository = new EmailRepository()
  }

  private async isDuplicate(key: string): Promise<{ isDuplicate: boolean; cachedResult?: any }> {
    try {
      const redis = await RedisConnection.getInstance()
      const cached = await redis.get(key)
      if (!cached) return { isDuplicate: false }
      return { isDuplicate: true, cachedResult: JSON.parse(cached) }
    } catch (error) {
      console.error('Redis error in isDuplicate:', error)
      if (SendMailService.REDIS_REQUIRED) throw new Error('Redis unavailable and required for idempotency')
      console.warn('Redis unavailable, proceeding without cache check')
      return { isDuplicate: false }
    }
  }

  private async cacheResult(key: string, result: any): Promise<void> {
    try {
      const redis = await RedisConnection.getInstance()
      await redis.setex(key, SendMailService.CACHE_TTL, JSON.stringify(result))
    } catch (error) {
      console.error('Redis error in cacheResult:', error)
      if (SendMailService.REDIS_REQUIRED) throw new Error('Redis unavailable and required for idempotency')
      console.warn('Redis unavailable, proceeding without caching')
    }
  }

  async execute(data: SendMailRequest) {
    const key = generatePayloadHash(data)

    const acquired = await Lock.acquire(key)
    if (!acquired) {
      return { status: 'processing', message: 'Request is already being processed' }
    }

    try {
      const { isDuplicate, cachedResult } = await this.isDuplicate(key)
      if (isDuplicate) return cachedResult || { status: 'duplicate', message: 'Request already processed' }

      const mailSender = new MailSender(data.from, data.to, data.subject, data.message, data.text)
      const result = await mailSender.sendMail()
      if (result instanceof Error) throw result

      await this.cacheResult(key, result)

      const from = typeof data.from === 'string' ? data.from : data.from.address
      const to = typeof data.to === 'string' ? data.to : data.to.address
      await this.repository.save(new Email(from, to, data.subject, data.message, data.text, key))

      return result
    } catch (error) {
      console.error('[SendMailService] Error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' }
    } finally {
      await Lock.release(key)
    }
  }

  async listAll() {
    return await this.repository.all()
  }
}
