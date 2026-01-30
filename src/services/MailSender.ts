import Mail, { Address } from 'nodemailer/lib/mailer'
import nodemailer from 'nodemailer'

export default class MailSender {
    constructor (
        public from: Address,
        public to: Address,
        public subject: string,
        public message: string,
        public text?: string
    ){}

    public async sendMail() {
        const validationError = this.validateFields()
        if (validationError) return validationError

        const transporter = nodemailer.createTransport(this.getMailServerConfig())
        return await transporter.sendMail(this.getMailOptions())
    }

    private validateFields(): Error | null {
        if (!this.from) return new Error('Sender email (from) is required.')
        if (!this.to) return new Error('Recipient email (to) is required.')
        if (!this.message) return new Error('A email message is required.')
        return null
    }

    private getMailServerConfig() {
        return {
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            secure: Number(process.env.MAIL_PORT) === 465,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        }
    }

    private getMailOptions(): Mail.Options {
        return {
            from: this.from,
            to: this.to,
            subject: this.subject,
            text: this.text,
            html: this.message
        }
    }
}