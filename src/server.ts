import express, { Request, Response } from 'express'
import nodemailer from 'nodemailer'
import mailConfig from '../config/mail.json'
import generateMessage from './mail/message'

const app = express()
app.use(express.json())

app.post('/send-email', (request: Request, response: Response) => {
    const { email, name } = request.body
    
    const mailOptions = generateMessage({ name, email })
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