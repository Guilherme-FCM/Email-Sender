# Email-Sender Project Structure

## Directory Organization

```
Email-Sender/
├── src/                          # Source code directory
│   ├── controllers/              # HTTP request handlers
│   │   └── SendMailController.ts # Email sending endpoint controller
│   ├── database/                 # Database connection layer
│   │   └── DynamoDBConnection.ts # AWS DynamoDB client configuration
│   ├── entities/                 # Domain models
│   │   └── Email.ts              # Email entity definition
│   ├── repositories/             # Data access layer
│   │   └── EmailRepository.ts    # Email CRUD operations
│   ├── services/                 # Business logic layer
│   │   ├── MailSender.ts         # Nodemailer wrapper service
│   │   ├── MailSender.test.ts    # MailSender unit tests
│   │   ├── SendMailService.ts    # Email sending orchestration
│   │   └── SendMailService.test.ts # SendMailService unit tests
│   ├── routes.ts                 # API route definitions
│   └── server.ts                 # Express application entry point
├── config/                       # Configuration files (not in repo)
│   └── mail.json                 # Mailtrap/SMTP configuration
├── .env                          # Environment variables
├── .env.example                  # Environment variables template
├── docker-compose.yml            # Docker services orchestration
├── Dockerfile                    # Application container definition
├── jest.config.js                # Jest testing configuration
├── package.json                  # Node.js dependencies and scripts
├── tsconfig.json                 # TypeScript compiler configuration
└── README.md                     # Project documentation
```

## Core Components

### 1. HTTP Layer (Controllers)
**SendMailController**: Handles incoming HTTP requests to the `/send-email` endpoint
- Validates request body structure
- Delegates to SendMailService for business logic
- Returns appropriate HTTP responses (success/error)

### 2. Business Logic Layer (Services)
**SendMailService**: Orchestrates email sending workflow
- Implements duplicate detection using in-memory cache with TTL
- Coordinates between MailSender and EmailRepository
- Handles error scenarios and returns structured responses

**MailSender**: Wraps Nodemailer functionality
- Configures SMTP transport from environment/config
- Formats email messages (HTML and plain text)
- Executes actual email transmission

### 3. Data Access Layer (Repositories)
**EmailRepository**: Manages email record persistence
- Abstracts DynamoDB operations
- Provides CRUD operations for Email entities
- Handles database connection through DynamoDBConnection

### 4. Domain Layer (Entities)
**Email**: Represents email data model
- Defines email structure (from, to, subject, message, text)
- Provides data validation and transformation
- Maps to DynamoDB table schema

### 5. Infrastructure Layer (Database)
**DynamoDBConnection**: Manages AWS DynamoDB client
- Configures DynamoDB client with credentials and endpoint
- Provides singleton connection instance
- Supports local DynamoDB for development

## Architectural Patterns

### Layered Architecture
The application follows a clean layered architecture:
```
HTTP Request → Controller → Service → Repository → Database
                              ↓
                         MailSender (External Service)
```

### Dependency Flow
- Controllers depend on Services
- Services depend on Repositories and external service wrappers
- Repositories depend on Database connections
- Entities are pure data models with no dependencies

### Separation of Concerns
- **Controllers**: HTTP protocol handling only
- **Services**: Business rules and orchestration
- **Repositories**: Data persistence abstraction
- **Entities**: Domain model representation
- **Database**: Infrastructure connection management

### Design Patterns Used
1. **Repository Pattern**: Abstracts data access logic
2. **Service Layer Pattern**: Encapsulates business logic
3. **Singleton Pattern**: Database connection management
4. **Dependency Injection**: Services receive dependencies via constructor
5. **Factory Pattern**: Email entity creation

## Request Flow Example

1. Client sends POST request to `/send-email`
2. Express routes request to SendMailController
3. Controller validates request and calls SendMailService.execute()
4. SendMailService checks duplicate cache
5. If not duplicate:
   - Creates MailSender instance
   - Sends email via Nodemailer
   - Creates Email entity
   - Saves to DynamoDB via EmailRepository
   - Updates duplicate cache
6. Controller returns response to client

## Testing Structure
- Unit tests colocated with service files (*.test.ts)
- Jest configuration for TypeScript support
- Test coverage reporting available
- Mocking of external dependencies (Nodemailer, DynamoDB)
