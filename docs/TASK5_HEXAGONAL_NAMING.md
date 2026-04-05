# TASK5: Hexagonal Naming & Interface-Driven Design

## Summary

Renamed implementation classes and extracted port interfaces to align with hexagonal architecture naming conventions, without changing the folder structure.

## Changes

### New Interfaces (Ports)
| File | Description |
|---|---|
| `src/services/IEmailSender.ts` | Port for sending emails |
| `src/repositories/IEmailRepository.ts` | Port for email persistence |
| `src/utils/ICacheService.ts` | Port for cache get/set |
| `src/utils/ILockService.ts` | Port for distributed locking |
| `src/workers/ISQSEmailWorker.ts` | Interface for the SQS worker |

### Renamed Implementations (Adapters)
| Old | New |
|---|---|
| `services/MailSender.ts` | `services/NodemailerEmailSender.ts` |
| `services/SendMailService.ts` | `services/SendMailUseCase.ts` |
| `repositories/EmailRepository.ts` | `repositories/DynamoDBEmailRepository.ts` |
| `utils/Lock.ts` | `utils/RedisLockService.ts` |
| `workers/EmailWorker.ts` | `workers/SQSEmailWorker.ts` |
| `workers/IEmailWorker.ts` | `workers/ISQSEmailWorker.ts` |

### New Adapter
| File | Description |
|---|---|
| `src/utils/RedisCacheService.ts` | Extracted Redis cache logic from `SendMailUseCase` into its own class implementing `ICacheService` |

### Updated
- `SendMailUseCase` — dependencies injected via constructor using port interfaces
- `SendMailController` — imports updated
- `server.ts` — imports updated
- `README.md` — full rewrite reflecting actual project state
- `MVP_TASKS.md` → `ROADMAP.md` — renamed and cleaned up

## Design Decision

`SendMailUseCase` accepts all four dependencies via optional constructor parameters. When called without arguments (e.g. from the worker), it instantiates the default adapters. When called in tests, concrete mocks are injected directly — no `jest.mock()` of modules required for the use case tests.

## Tests

117 tests, all passing. New test files added:
- `NodemailerEmailSender.test.ts`
- `DynamoDBEmailRepository.test.ts`
- `RedisLockService.test.ts`
- `RedisCacheService.test.ts`
- `SQSEmailWorker.test.ts`
- `SendMailUseCase.test.ts`
