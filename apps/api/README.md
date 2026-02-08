# Agentic Commerce API

Backend API for the Agentic Commerce Platform - an AI-powered multi-retailer shopping orchestration system.

## Tech Stack

- **Framework**: Fastify 5.x
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **AI**: OpenAI GPT-4
- **Task Queue**: BullMQ

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push

# Seed database with demo data
pnpm db:seed

# Start development server
pnpm dev
```

### Environment Variables

| Variable         | Description               | Default                  |
| ---------------- | ------------------------- | ------------------------ |
| `PORT`           | Server port               | `3001`                   |
| `HOST`           | Server host               | `0.0.0.0`                |
| `NODE_ENV`       | Environment               | `development`            |
| `DATABASE_URL`   | PostgreSQL connection URL | -                        |
| `REDIS_URL`      | Redis connection URL      | `redis://localhost:6379` |
| `OPENAI_API_KEY` | OpenAI API key            | -                        |
| `CORS_ORIGIN`    | Allowed CORS origin       | `http://localhost:3000`  |
| `JWT_SECRET`     | JWT signing secret        | -                        |

## API Endpoints

### Health

- `GET /api/health` - Basic health check
- `GET /api/health/ready` - Readiness check with dependencies

### Sessions

- `POST /api/sessions` - Create shopping session
- `GET /api/sessions/:id` - Get session details
- `PATCH /api/sessions/:id` - Update session
- `POST /api/sessions/:id/discover` - Start product discovery

### AI

- `POST /api/ai/parse-intent` - Parse natural language shopping request
- `POST /api/ai/clarify` - Process clarification response
- `GET /api/ai/questions/:sessionId` - Get clarifying questions

### Discovery

- `POST /api/discovery/search` - Search products
- `GET /api/discovery/products/:id` - Get product details
- `GET /api/discovery/categories/:category` - Browse by category
- `GET /api/discovery/retailers` - List available retailers

### Cart

- `GET /api/cart/:cartId` - Get cart details
- `GET /api/cart/session/:sessionId` - Get all session carts
- `POST /api/cart/:cartId/items` - Add item
- `PATCH /api/cart/:cartId/items/:itemId` - Update item
- `DELETE /api/cart/:cartId/items/:itemId` - Remove item
- `POST /api/cart/:cartId/optimize` - Optimize cart
- `POST /api/cart/:cartId/select` - Select cart for checkout

### Ranking

- `GET /api/ranking/session/:sessionId` - Get ranked carts
- `GET /api/ranking/explain/:cartId` - Get ranking explanation
- `GET /api/ranking/compare` - Compare two carts

### Checkout

- `POST /api/checkout/simulate` - Start simulated checkout
- `GET /api/checkout/:checkoutId/status` - Get checkout progress
- `GET /api/checkout/:checkoutId/summary` - Get final summary

## Development

```bash
# Run in development mode with hot reload
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint

# Run tests
pnpm test

# Build for production
pnpm build

# Start production server
pnpm start
```

## Database Commands

```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes (dev)
pnpm db:push

# Create migration
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio

# Seed database
pnpm db:seed
```

## Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Build image only
docker build -t agentic-commerce-api .

# Run container
docker run -p 3001:3001 --env-file .env agentic-commerce-api
```

## API Documentation

Interactive API documentation is available at `/docs` when the server is running.

## Architecture

```
src/
├── index.ts           # Fastify app entry point
├── config/            # Environment, database, Redis config
├── plugins/           # Fastify plugins (auth, cors, swagger)
├── routes/            # API route handlers
├── services/          # Business logic services
│   ├── ai/            # Intent parsing, explanations
│   ├── discovery/     # Product search, retailer adapters
│   ├── ranking/       # Cart scoring, optimization
│   ├── cart/          # Cart management
│   └── checkout/      # Checkout simulation
├── schemas/           # Zod validation schemas
└── types/             # TypeScript type definitions
```

## License

MIT
