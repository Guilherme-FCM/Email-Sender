import express from 'express'
import dotenv from 'dotenv'
import routes from './routes'
import { EmailWorker } from './workers/EmailWorker'

dotenv.config()

const app = express()
app.use(express.json())
app.use(routes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}! 🚀`)

  const worker = new EmailWorker()
  worker.start().catch((error) => {
    console.error('EmailWorker crashed:', error)
  })
  console.log('EmailWorker started 📨')
})