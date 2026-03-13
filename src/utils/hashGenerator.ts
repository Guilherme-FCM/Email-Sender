import crypto from 'crypto'
import { Address } from 'nodemailer/lib/mailer'

type EmailData = {
  from: string | Address
  to: string | Address
  subject: string
}

export function generatePayloadHash(data: EmailData): string {
  const from = typeof data.from === 'string' ? data.from : data.from.address
  const to = typeof data.to === 'string' ? data.to : data.to.address
  const content = `${from}|${to}|${data.subject}`
  return crypto.createHash('sha256').update(content).digest('hex')
}
