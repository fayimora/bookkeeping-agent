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
AGENT_TELEMETRY_INCLUDE_CONTENT = false # opt in only for local debugging
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = "http://127.0.0.1:27686/v1/traces"
OTEL_BSP_SCHEDULE_DELAY = 500 # milliseconds
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

## Trace chats with Motel

Start [Motel](https://github.com/kitlangton/motel) in a separate terminal before using the app:

```bash
bun run motel
```

The web and agent servers export traces to Motel by default. Set `OTEL_SDK_DISABLED=true` to disable export. Agent telemetry includes timings, model/provider details, tools, failures, and token usage, but excludes prompts, responses, tool payloads, and receipt content by default. Set `AGENT_TELEMETRY_INCLUDE_CONTENT=true` only when that sensitive local content is needed for debugging.

Each chat displays a copyable **Debug ID**. Every message is a separate trace annotated with the same `chat.id`, so all turns for one chat can be found with:

```bash
curl -G http://127.0.0.1:27686/api/traces/search \
  --data-urlencode service=bookkeeping-web \
  --data-urlencode 'attr.chat.id=<copied-debug-id>'
```

Open one returned trace in Motel to inspect the web request, Flue agent and model calls, tool execution, and nested Effect operations as one waterfall.

## Demo users

Signups are disabled. The seed command creates these users and their category lists:

| Username | Password |
| --- | --- |
| `alice` | `alicepassword` |
| `bob` | `bobpassword` |
| `charlie` | `charliepassword` |


