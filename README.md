# Bookkeeping Agent

A small playground for learning [Flue](https://flueframework.com) and [Effect](https://effect.website). It wraps a fake bookkeeping ledger in an AI assistant that can enter receipts, manage expenses and categories, and answer spending questions.

This is an experimental learning project, not a production bookkeeping system.

Built with Bun workspaces, React, TanStack Start, PostgreSQL, and Drizzle.

## Run locally

Install dependencies:

```bash
bun install
```

Create an environment file `.mise.local.toml` with the required server variables:

```toml
[env]
DATABASE_URL = "postgresql://postgres:password@localhost:5434/bookeeping-agent"
CORS_ORIGIN = "http://localhost:3001"
BETTER_AUTH_SECRET = "bookkeeping-agent-local-dev-secret-change-me"
AGENT_MODEL = "openrouter/openai/gpt-5.6-luna"
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

- Web app: <http://localhost:3001>
- Flue API: <http://localhost:3583>

## Demo users

Signups are disabled. The seed command creates these users and their category lists:

| Username | Password |
| --- | --- |
| `alice` | `alicepassword` |
| `bob` | `bobpassword` |
| `charlie` | `charliepassword` |


