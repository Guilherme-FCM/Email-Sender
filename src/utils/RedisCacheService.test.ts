import { RedisCacheService } from './RedisCacheService'
import RedisConnection from '../database/RedisConnection'

jest.mock('../database/RedisConnection')

describe('RedisCacheService', () => {
  let service: RedisCacheService
  let mockGet: jest.Mock
  let mockSetex: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockGet = jest.fn()
    mockSetex = jest.fn().mockResolvedValue('OK')
    ;(RedisConnection.getInstance as jest.Mock).mockResolvedValue({
      get: mockGet,
      setex: mockSetex,
    })
    service = new RedisCacheService()
  })

  describe('get', () => {
    it('should return cached value when key exists', async () => {
      mockGet.mockResolvedValue('{"messageId":"123"}')
      const result = await service.get('some-key')
      expect(result).toBe('{"messageId":"123"}')
      expect(mockGet).toHaveBeenCalledWith('some-key')
    })

    it('should return null when key does not exist', async () => {
      mockGet.mockResolvedValue(null)
      const result = await service.get('missing-key')
      expect(result).toBeNull()
    })
  })

  describe('set', () => {
    it('should store value with TTL', async () => {
      await service.set('some-key', '{"messageId":"123"}', 300)
      expect(mockSetex).toHaveBeenCalledWith('some-key', 300, '{"messageId":"123"}')
    })
  })
})
