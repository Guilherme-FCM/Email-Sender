export interface ISQSEmailWorker {
  start(): Promise<void>
  stop(): void
}
