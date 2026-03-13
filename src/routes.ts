import express from 'express'
import SendMailController from './controllers/SendMailController'
import HealthController from './controllers/HealthController'

const routes = express.Router()

routes.get('/health', HealthController.health)
routes.get('/ready', HealthController.ready)
routes.get('/emails', SendMailController.list)
routes.post('/send-email', SendMailController.handle)

export default routes