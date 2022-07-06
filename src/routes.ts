import express, { Request, Response } from 'express'
import MailSender from './services/MailSender'

const routes = express.Router()

routes.post('/send-email', async (request: Request, response: Response) => {
    const { from, to, subject, message, text } = request.body

    const mailSender = new MailSender(from, to, subject, message, text)
    const result = await mailSender.sendMail()
    
    if (result instanceof Error) 
        return response.status(400).json({ error: result.message })
    return response.json(result)
})

export default routes