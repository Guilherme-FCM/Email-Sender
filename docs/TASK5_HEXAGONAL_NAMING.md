# TASK5: Hexagonal Naming & Interface-Driven Design

## Summary

Renamed implementation classes and extracted port interfaces to align with hexagonal architecture naming conventions, without changing the folder structure. Removed all superseded files.

## New Interfaces (Ports)

| File | Description |
|---|---|
| `src/services/IEmailSender.ts` | Port for sending emails |
| `src/repositories/IEmailRepository.ts` | Port for email persistence |
| `src/utils/ICacheService.ts` | Port for cache get/set |
| `src/utils/ILockService.ts` | Port for distributed locking |
| `src/workers/ISQSEmailWorker.ts` | Interface for the SQS worker |

## Renamed Implementations (Adapters)

| Old | New |
|---|---|
| `services/MailSender.ts` | `services/NodemailerEmailSender.ts` (implements `IEmailSender`) |
| `repositories/EmailRepository.ts` | `repositories/DynamoDBEmailRepository.ts` (implements `IEmailRepository`) |
| `utils/Lock.ts` | `utils/RedisLockService.ts` (implements `ILockService`) |
| `workers/EmailWorker.ts` | `workers/SQSEmailWorker.ts` (implements `ISQSEmailWorker`) |
| `workers/IEmailWorker.ts` | `workers/ISQSEmailWorker.ts` |

## New Adapter

| File | Description |
|---|---|
| `src/utils/RedisCacheService.ts` | Redis cache logic extracted from `SendMailService`, implements `ICacheService` |

## Updated

- `SendMailService` — dependencies now injected via constructor using port interfaces (`IEmailSender`, `IEmailRepository`, `ICacheService`, `ILockService`)
- `SendMailController` — imports updated
- `server.ts` — imports updated
- `README.md` — full rewrite reflecting actual project state
- `MVP_TASKS.md` → `ROADMAP.md` — renamed and cleaned up

## Design Decision

`SendMailService` accepts all four dependencies via optional constructor parameters. When called without arguments (e.g. from the worker), it instantiates the default adapters. When called in tests, concrete mocks are injected directly — no `jest.mock()` of infrastructure modules required.

## Tests

147 tests passing across all layers.
