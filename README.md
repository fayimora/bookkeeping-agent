# Bookkeeping Agent

A fake bookkeeping app with an AI assistant for entering receipts, managing expenses/categories, and answering spending questions from the ledger. 

## Stack

- Bun workspaces
- React + TanStack Start web app
- Flue agent runtime
- PostgreSQL + Drizzle

## Apps and packages

```txt
apps/web      Web app
apps/agent    Bookkeeping assistant
packages/db   Database schema, Effect repositories, and seed scripts
packages/ui   Shared UI components
packages/env  Environment validation
```

## Setup

Install dependencies:

```bash
bun install
```

Create an environment file `.mise.local.toml` with the required server variables:

```toml
[env]
DATABASE_URL = "postgres://postgres:postgres@localhost:5434/bookkeeping"
CORS_ORIGIN = "http://localhost:3001"
BETTER_AUTH_SECRET = "bookkeeping-agent-local-dev-secret-change-me"
AGENT_MODEL = "openrouter/moonshotai/kimi-k2.6"
AGENT_OBSERVABILITY = "summary" # off, summary, or verbose
OPENROUTER_API_KEY = "sk-or-v1-xxxxx"
```

Start the local database, run migrations, and seed demo users/categories:

```bash
bun run db:start
bun run db:migrate
bun run db:seed
```

Start development servers:

```bash
bun run dev
```

Web App: <http://localhost:3001>
Flue API: <http://localhost:3583>

## Seeded users

Signups are disabled. Run `bun run db:seed` to create the default users and their per-user category lists.

| Username | Password |
| --- | --- |
| `alice` | `alicepassword` |
| `bob` | `bobpassword` |
| `charlie` | `charliepassword` |


