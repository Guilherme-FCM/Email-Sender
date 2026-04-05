import Email from '../entities/Email'

export interface IEmailRepository {
  save(email: Email): Promise<void>
  all(): Promise<Email[]>
}
