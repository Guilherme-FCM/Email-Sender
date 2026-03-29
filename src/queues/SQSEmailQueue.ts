import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { IEmailQueue, QueueEmailRequest, EnqueueResult } from './IEmailQueue'

export class SQSEmailQueue implements IEmailQueue {
  private client: SQSClient | null = null
  private queueUrl: string

  constructor() {
    this.queueUrl = process.env.SQS_QUEUE_URL!
  }

  private getClient(): SQSClient {
    if (!this.client) {
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
    }
    return this.client
  }

  async enqueue(data: QueueEmailRequest, correlationId: string): Promise<EnqueueResult> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(data),
      MessageAttributes: {
        CorrelationId: { DataType: 'String', StringValue: correlationId },
      },
    })

    const result = await this.getClient().send(command)

    if (!result.MessageId) {
      throw new Error('SQS did not return a MessageId')
    }

    return { messageId: result.MessageId, correlationId }
  }
}
