import { DynamoDBClient, DynamoDBClientConfig, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

export default class DynamoDBConnection {
  private static instance: DynamoDBDocumentClient | null = null
  private static client: DynamoDBClient | null = null
  private static config: DynamoDBConfig

  static async getInstance(): Promise<DynamoDBDocumentClient> {
    if (!this.instance) {
      this.config = new DynamoDBConfig()
      this.client = new DynamoDBClient(this.config.getConfig())
      this.instance = DynamoDBDocumentClient.from(this.client)
      await this.ensureTableExists()
    }
    return this.instance
  }

  private static async ensureTableExists(): Promise<void> {
    try {
      await this.client!.send(new DescribeTableCommand({ TableName: this.config.getTableName() }))
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        await this.createTable()
      } else {
        throw error
      }
    }
  }

  private static async createTable(): Promise<void> {
    const params = new CreateTableCommand({
      TableName: this.config.getTableName(),
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST'
    })
    await this.client!.send(params)
    console.log(`Table ${this.config.getTableName()} created successfully`)
  }

  static getTableName(): string {
    return this.config.getTableName()
  }
}

class DynamoDBConfig {
  private region = process.env.AWS_REGION || 'us-east-1'
  private accessKeyId = process.env.AWS_ACCESS_KEY_ID || ''
  private secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || ''
  private tableName = process.env.DYNAMODB_TABLE || 'emails'
  private endpoint = process.env.DYNAMODB_ENDPOINT

  getConfig(): DynamoDBClientConfig {
    if (!this.accessKeyId) throw new Error('AWS_ACCESS_KEY_ID is required.')
    if (!this.secretAccessKey) throw new Error('AWS_SECRET_ACCESS_KEY is required.')

    return {
      region: this.region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      }
    }
  }

  getTableName(): string {
    return this.tableName
  }
}
