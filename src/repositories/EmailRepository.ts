import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import DynamoDB from '../database/DynamoDBConnection'
import Email from '../entities/Email'

export class EmailRepository {
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
        createdAt: new Date().toISOString(),
      },
    })

    await dynamoDB.send(params)
  }

  async all(): Promise<any> {
    const dynamoDB = await DynamoDB.getInstance()
    const params = new ScanCommand({
      TableName: DynamoDB.getTableName(),
    })

    return dynamoDB.send(params)
  }
}