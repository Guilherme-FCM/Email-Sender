import express, { Request, Response } from 'express'
import nodemailer from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'
import mailConfig from '../config/mail.json'

const app = express()
app.use(express.json())

app.post('/send-email', (request: Request, response: Response) => {
    const { from, to, subject, message, text } = request.body

    if (! from) return response.status(400).json({
        error: "Sender email (from) is required."
    }) 
    if (! to) return response.status(400).json({
        error: "Recipient email (to) is required."
    }) 
    if (! message) return response.status(400).json({
        error: "A email message is required."
    }) 

    const mailOptions: Mail.Options = { 
        from, to, subject, text,
        html: message
    }
    const transporter = nodemailer.createTransport(mailConfig);

    transporter.sendMail(mailOptions, error => {
        if (error) return response.status(400).json({
            error: error.message
        }) 
        return response.json({
            message: 'Email sent successfully.'
        })
    })
})

app.listen(3333, () => {
    console.log('Server started! 🚀')
})