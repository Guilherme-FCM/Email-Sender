import Mail, { Address } from 'nodemailer/lib/mailer'
import nodemailer from 'nodemailer'
import mailServerConfig from '../../config/mail.json'

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
        const transporter = nodemailer.createTransport(mailServerConfig);
        return await transporter.sendMail(mailOptions)
    }
}