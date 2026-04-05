import { Address } from 'nodemailer/lib/mailer'
import Email from '../entities/Email'
import { generatePayloadHash } from '../utils/hashGenerator'
import { IEmailSender } from './IEmailSender'
import { IEmailRepository } from '../repositories/IEmailRepository'
import { ICacheService } from '../utils/ICacheService'
import { ILockService } from '../utils/ILockService'
import { NodemailerEmailSender } from './NodemailerEmailSender'
import { DynamoDBEmailRepository } from '../repositories/DynamoDBEmailRepository'
import { RedisCacheService } from '../utils/RedisCacheService'
import { RedisLockService } from '../utils/RedisLockService'

type SendMailRequest = {
  from: Address
  to: Address
  subject: string
  message: string
  text?: string
}

export default class SendMailService {
  private static readonly CACHE_TTL = Number(process.env.IDEMPOTENCY_TTL) || 300
  private static get REDIS_REQUIRED() { return process.env.REDIS_REQUIRED !== 'false' }

  private readonly emailSender: IEmailSender
  private readonly repository: IEmailRepository
  private readonly cache: ICacheService
  private readonly lock: ILockService

  constructor(
    emailSender?: IEmailSender,
    repository?: IEmailRepository,
    cache?: ICacheService,
    lock?: ILockService
  ) {
    this.emailSender = emailSender ?? new NodemailerEmailSender()
    this.repository = repository ?? new DynamoDBEmailRepository()
    this.cache = cache ?? new RedisCacheService()
    this.lock = lock ?? new RedisLockService()
  }

  private async isDuplicate(key: string): Promise<{ isDuplicate: boolean; cachedResult?: any }> {
    try {
      const cached = await this.cache.get(key)
      if (!cached) return { isDuplicate: false }
      return { isDuplicate: true, cachedResult: JSON.parse(cached) }
    } catch (error) {
      console.error('Cache error in isDuplicate:', error)
      if (SendMailService.REDIS_REQUIRED) throw new Error('Redis unavailable and required for idempotency')
      console.warn('Redis unavailable, proceeding without cache check')
      return { isDuplicate: false }
    }
  }

  private async cacheResult(key: string, result: any): Promise<void> {
    try {
      await this.cache.set(key, JSON.stringify(result), SendMailService.CACHE_TTL)
    } catch (error) {
      console.error('Cache error in cacheResult:', error)
      if (SendMailService.REDIS_REQUIRED) throw new Error('Redis unavailable and required for idempotency')
      console.warn('Redis unavailable, proceeding without caching')
    }
  }

  async execute(data: SendMailRequest) {
    const key = generatePayloadHash(data)

    const acquired = await this.lock.acquire(key)
    if (!acquired) {
      return { status: 'processing', message: 'Request is already being processed' }
    }

    try {
      const { isDuplicate, cachedResult } = await this.isDuplicate(key)
      if (isDuplicate) return cachedResult || { status: 'duplicate', message: 'Request already processed' }

      const result = await this.emailSender.send(data)

      await this.cacheResult(key, result)

      const from = typeof data.from === 'string' ? data.from : data.from.address
      const to = typeof data.to === 'string' ? data.to : data.to.address
      await this.repository.save(new Email(from, to, data.subject, data.message, data.text, key))

      return result
    } catch (error) {
      console.error('[SendMailService] Error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' }
    } finally {
      await this.lock.release(key)
    }
  }

  async listAll() {
    return this.repository.all()
  }
}
