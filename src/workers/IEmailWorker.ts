export interface IEmailWorker {
  start(): Promise<void>
  stop(): void
}
