import { Request, Response } from 'express'
import RedisConnection from '../database/RedisConnection'
import DynamoDBConnection from '../database/DynamoDBConnection'

export default class HealthController {
  public static async health(request: Request, response: Response): Promise<Response> {
    return response.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    })
  }

  public static async ready(request: Request, response: Response): Promise<Response> {
    const checks = {
      redis: false,
      dynamodb: false
    }

    try {
      checks.redis = await RedisConnection.healthCheck()
    } catch (error) {
      console.error('Redis health check failed:', error)
    }

    try {
      const dynamodb = await DynamoDBConnection.getInstance()
      checks.dynamodb = !!dynamodb
    } catch (error) {
      console.error('DynamoDB health check failed:', error)
    }

    const allHealthy = checks.redis && checks.dynamodb

    if (allHealthy) {
      return response.json({ 
        status: 'ready', 
        checks,
        timestamp: new Date().toISOString() 
      })
    }

    return response.status(503).json({ 
      status: 'not_ready', 
      checks,
      timestamp: new Date().toISOString() 
    })
  }
}
