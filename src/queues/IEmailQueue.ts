import { Address } from 'nodemailer/lib/mailer'

export type QueueEmailRequest = {
  from: Address
  to: Address
  subject: string
  message: string
  text?: string
}

export type EnqueueResult = {
  messageId: string
  correlationId: string
}

export interface IEmailQueue {
  enqueue(data: QueueEmailRequest, correlationId: string): Promise<EnqueueResult>
}
