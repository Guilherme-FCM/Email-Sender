export interface ILockService {
  acquire(resource: string): Promise<boolean>
  release(resource: string): Promise<void>
}
