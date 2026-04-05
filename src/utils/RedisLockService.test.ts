import { RedisLockService } from './RedisLockService'
import RedisConnection from '../database/RedisConnection'

jest.mock('../database/RedisConnection')

describe('RedisLockService', () => {
  let service: RedisLockService
  let mockSet: jest.Mock
  let mockDel: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation()
    mockSet = jest.fn()
    mockDel = jest.fn()
    ;(RedisConnection.getInstance as jest.Mock).mockResolvedValue({
      set: mockSet,
      del: mockDel,
    })
    service = new RedisLockService()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('acquire', () => {
    it('should return true when lock is acquired', async () => {
      mockSet.mockResolvedValue('OK')
      expect(await service.acquire('resource-1')).toBe(true)
      expect(mockSet).toHaveBeenCalledWith('lock:resource-1', '1', 'EX', expect.any(Number), 'NX')
    })

    it('should return false when lock is already held', async () => {
      mockSet.mockResolvedValue(null)
      expect(await service.acquire('resource-1')).toBe(false)
    })

    it('should return false when Redis is unavailable', async () => {
      ;(RedisConnection.getInstance as jest.Mock).mockRejectedValue(new Error('Connection refused'))
      expect(await service.acquire('resource-1')).toBe(false)
    })
  })

  describe('release', () => {
    it('should delete the lock key', async () => {
      mockDel.mockResolvedValue(1)
      await service.release('resource-1')
      expect(mockDel).toHaveBeenCalledWith('lock:resource-1')
    })

    it('should not throw when Redis is unavailable', async () => {
      ;(RedisConnection.getInstance as jest.Mock).mockRejectedValue(new Error('Connection refused'))
      await expect(service.release('resource-1')).resolves.not.toThrow()
    })
  })
})
