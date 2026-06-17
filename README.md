# Bookkeeping Agent

A personal bookkeeping app with an AI assistant for entering receipts, managing expenses/categories, and answering spending questions from the ledger.

## Stack

- Bun workspaces
- React + TanStack Start web app
- Flue agent runtime
- PostgreSQL + Drizzle

## Apps and packages

```txt
apps/web      Web app
apps/agent    Bookkeeping assistant
packages/db   Database schema, queries, and seed scripts
packages/ui   Shared UI components
packages/env  Environment validation
```

## Setup

Install dependencies:

```bash
bun install
```

Create an environment file `.mise.local.toml` with the required server variables:

```env
[env]
DATABASE_URL=postgres://postgres:postgres@localhost:5434/bookkeeping
CORS_ORIGIN=http://localhost:3001
AGENT_MODEL=openrouter/moonshotai/kimi-k2.6
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

Start the local database, push the schema, and seed optional sample data:

```bash
bun run db:start
bun run db:push
bun run db:seed
```

Start development servers:

```bash
bun run dev
```

Web App: <http://localhost:3001>
Flue API: <http://localhost:3583>

