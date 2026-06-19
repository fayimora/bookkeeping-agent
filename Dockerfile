# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14 AS builder
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY apps/agent/package.json apps/agent/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.3.14 AS web
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app /app

EXPOSE 3000
CMD ["sh", "-c", "cd /app && bun run db:migrate && cd apps/web && bun run vp preview --host 0.0.0.0 --port ${PORT:-3000}"]

FROM node:24-slim AS agent
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3583

COPY --from=builder /app /app

EXPOSE 3583
CMD ["node", "apps/agent/dist/server.mjs"]
