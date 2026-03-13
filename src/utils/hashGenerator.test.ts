import { generatePayloadHash } from './hashGenerator'
import { Address } from 'nodemailer/lib/mailer'

describe('hashGenerator', () => {
  describe('generatePayloadHash', () => {
    it('should generate SHA-256 hash from email data (from, to, subject)', () => {
      const data = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject'
      }

      const hash = generatePayloadHash(data)

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(64) // SHA-256 produces 64 hex characters
    })

    it('should produce same hash for same input (deterministic)', () => {
      const data = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject'
      }

      const hash1 = generatePayloadHash(data)
      const hash2 = generatePayloadHash(data)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hash for different subject', () => {
      const data1 = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject'
      }

      const data2 = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Different Subject'
      }

      const hash1 = generatePayloadHash(data1)
      const hash2 = generatePayloadHash(data2)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle Address object for from field', () => {
      const data = {
        from: { name: 'Sender', address: 'sender@example.com' } as Address,
        to: 'recipient@example.com',
        subject: 'Test Subject'
      }

      const hash = generatePayloadHash(data)

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
    })

    it('should handle Address object for to field', () => {
      const data = {
        from: 'sender@example.com',
        to: { name: 'Recipient', address: 'recipient@example.com' } as Address,
        subject: 'Test Subject'
      }

      const hash = generatePayloadHash(data)

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
    })

    it('should produce same hash regardless of Address format', () => {
      const data1 = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject'
      }

      const data2 = {
        from: { name: 'Sender', address: 'sender@example.com' } as Address,
        to: { name: 'Recipient', address: 'recipient@example.com' } as Address,
        subject: 'Test Subject'
      }

      const hash1 = generatePayloadHash(data1)
      const hash2 = generatePayloadHash(data2)

      expect(hash1).toBe(hash2)
    })
  })
})
