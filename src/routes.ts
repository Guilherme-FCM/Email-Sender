import express from 'express'
import SendMailController from './controllers/SendMailController'

const routes = express.Router()

routes.post('/send-email', SendMailController.handle)

export default routes