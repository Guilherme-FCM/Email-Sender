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

    async sendMail() {
        if (! this.from) return new Error('Sender email (from) is required.')
        if (! this.to) return new Error('Recipient email (to) is required.')
        if (! this.message) return new Error('A email message is required.')

        const mailOptions: Mail.Options = { 
            from: this.from,
            to: this.to,
            subject: this.subject,
            text: this.text,
            html: this.message
        }
        
        const mailServerConfig = {
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            secure: Number(process.env.MAIL_PORT) === 465,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        }
        
        const transporter = nodemailer.createTransport(mailServerConfig);
        return await transporter.sendMail(mailOptions)
    }
}