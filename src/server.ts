import express from 'express'
import nodemailer from 'nodemailer'

const app = express()
app.use(express.json())

app.get('/', (request, response) => {
    return response.json({ message: 'Hello World!' })
})

app.post('/send-email', (request, response) => {
    const transporter = nodemailer.createTransport({
        host: "smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: "bd5c48a3368d62",
          pass: "9e64963176f678"
        }
    });

    const message = {
        from: "sender@server.com",
        to: "receiver@sender.com",
        subject: "Message title",
        text: "Plaintext version of the message",
        html: "<p>HTML version of the message</p>"
    }

    transporter.sendMail(message, error => {
        if (error) return response.status(400).json({
            error: error.message
        })
    })

    return response.json({
        message: 'Email sended.'
    })
})

app.listen(3333, () => {
    console.log('Server started! 🚀')
})