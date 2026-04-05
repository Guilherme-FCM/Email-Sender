import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import DynamoDB from '../database/DynamoDBConnection'
import Email from '../entities/Email'
import { IEmailRepository } from './IEmailRepository'

export class DynamoDBEmailRepository implements IEmailRepository {
  async save(email: Email): Promise<void> {
    const dynamoDB = await DynamoDB.getInstance()
    const params = new PutCommand({
      TableName: DynamoDB.getTableName(),
      Item: {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        from: email.from,
        to: email.to,
        subject: email.subject,
        message: email.message,
        text: email.text ?? '',
        idempotencyKey: email.idempotencyKey,
        version: email.version,
        createdAt: new Date().toISOString(),
      },
      ConditionExpression: 'attribute_not_exists(id)',
    })

    try {
      await dynamoDB.send(params)
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') return
      throw error
    }
  }

  async all(): Promise<Email[]> {
    const dynamoDB = await DynamoDB.getInstance()
    const params = new ScanCommand({ TableName: DynamoDB.getTableName() })
    const result = await dynamoDB.send(params)
    return (result.Items ?? []) as Email[]
  }
}
