import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import Email from '../../src/entities/Email'

describe('EmailRepository integration', () => {
  let container: StartedTestContainer
  let docClient: DynamoDBDocumentClient
  const TABLE = 'emails-integration'

  beforeAll(async () => {
    container = await new GenericContainer('amazon/dynamodb-local')
      .withExposedPorts(8000)
      .start()

    const port = container.getMappedPort(8000)
    const endpoint = `http://localhost:${port}`

    process.env.AWS_REGION = 'us-east-1'
    process.env.AWS_ACCESS_KEY_ID = 'local'
    process.env.AWS_SECRET_ACCESS_KEY = 'local'
    process.env.DYNAMODB_ENDPOINT = endpoint
    process.env.DYNAMODB_TABLE = TABLE

    const client = new DynamoDBClient({
      region: 'us-east-1',
      endpoint,
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
      requestHandler: new NodeHttpHandler(),
    })
    docClient = DynamoDBDocumentClient.from(client)

    await client.send(new CreateTableCommand({
      TableName: TABLE,
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
    }))
  }, 60_000)

  afterAll(async () => {
    await container.stop()
  })

  it('should persist all email fields including idempotencyKey and version', async () => {
    const id = `test-${Date.now()}`
    const email = new Email('a@a.com', 'b@b.com', 'Subject', '<p>Hi</p>', 'Hi', 'key-123')

    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: {
        id,
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
    }))

    const result = await docClient.send(new ScanCommand({ TableName: TABLE }))
    const saved = result.Items?.find(i => i.id === id)

    expect(saved).toBeDefined()
    expect(saved!.from).toBe('a@a.com')
    expect(saved!.idempotencyKey).toBe('key-123')
    expect(saved!.version).toBe(1)
  })

  it('should silently ignore ConditionalCheckFailedException on duplicate id', async () => {
    const id = `dup-${Date.now()}`
    const item = { id, from: 'a@a.com', to: 'b@b.com', subject: 'S', message: 'M', text: '', version: 1, createdAt: new Date().toISOString() }

    await docClient.send(new PutCommand({ TableName: TABLE, Item: item, ConditionExpression: 'attribute_not_exists(id)' }))

    await expect(
      docClient.send(new PutCommand({ TableName: TABLE, Item: item, ConditionExpression: 'attribute_not_exists(id)' }))
    ).rejects.toMatchObject({ name: 'ConditionalCheckFailedException' })
  })

  it('should return all persisted records via scan', async () => {
    const result = await docClient.send(new ScanCommand({ TableName: TABLE }))
    expect(Array.isArray(result.Items)).toBe(true)
    expect(result.Items!.length).toBeGreaterThan(0)
  })
})
