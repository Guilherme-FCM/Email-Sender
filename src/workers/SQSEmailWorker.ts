import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'
import pLimit from 'p-limit'
import { ISQSEmailWorker } from './ISQSEmailWorker'
import SendMailService from '../services/SendMailService'

export class SQSEmailWorker implements ISQSEmailWorker {
  private client: SQSClient
  private queueUrl: string
  private useCase: SendMailService
  private running = false
  private limit = pLimit(Number(process.env.SMTP_MAX_CONNECTIONS) || 5)

  constructor() {
    const endpoint = process.env.SQS_ENDPOINT
    this.client = new SQSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(endpoint && {
        endpoint,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
        },
      }),
    })
    this.queueUrl = process.env.SQS_QUEUE_URL!
    this.useCase = new SendMailService()
  }

  async start(): Promise<void> {
    this.running = true
    while (this.running) {
      await this.processMessages()
    }
  }

  stop(): void {
    this.running = false
  }

  isRunning(): boolean {
    return this.running
  }

  async processMessages(): Promise<void> {
    const { Messages = [] } = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ['All'],
      })
    )

    await Promise.all(
      Messages.map(message =>
        this.limit(async () => {
          try {
            const data = JSON.parse(message.Body!)
            await this.useCase.execute(data)
            await this.client.send(
              new DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: message.ReceiptHandle!,
              })
            )
          } catch (error) {
            console.error('[SQSEmailWorker] Failed to process message:', message.MessageId, error)
          }
        })
      )
    )
  }
}
