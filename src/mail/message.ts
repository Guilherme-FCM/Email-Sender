import Mail, { Address } from 'nodemailer/lib/mailer'

class MessageData {
    name: string 
    email: Address

    constructor(name: string, email: Address){
		this.name = name
		this.email = email
	}
}

export default (data: MessageData): Mail.Options => ({
    from: "guilherme.fcm@emailsender.com.br",
    to: data.email,
    subject: "Message from Email-Sender API",
    text: `Hello ${data.name}! Keep using our service.` ,
    html: `<h2>Hello ${data.name}!</h2><p>Keep using our service.</p>`
})