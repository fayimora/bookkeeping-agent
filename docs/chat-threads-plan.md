# Plan: Multiple chat threads per user

## Design decisions (from the investigation)

1. **Your DB is the source of truth for the UI transcript.** Flue keeps owning
   model-context/continuity in its `flue_*` tables; you never read/parse those.
   You add `conversations` + `messages` tables for display, listing, titles, and
   deletion.
2. **One Flue session per thread.** Today the Flue instance id is
   `session.user.id`, and that same id is reused inside the agent to scope DB
   tools to the user:
   ```ts
   // apps/web/src/server/chat.ts
   client.agents.prompt('bookkeeper', session.user.id, …)
   // apps/agent/src/agents/bookkeeper.ts
   createAgent(({ id: userId }) => ({ … tools: bookkeeperTools(userId) }))
   ```
   To give each thread its own isolated memory, the instance id becomes a
   **composite**: `` `${userId}::${conversationId}` ``. The agent parses the
   userId back out so expense/category scoping stays correct.
3. **Delete tradeoff.** Deleting a thread hard-deletes your
   `conversations`/`messages` rows (UI truth). Flue's per-session state can't be
   deleted over HTTP, so MVP leaves it orphaned (harmless — keys are unique and
   never reused). A clean cleanup path is included as an optional phase.
4. **No receipt bytes stored** (unchanged from the MVP stance) — messages store
   attachment *names* only for display.

## Key constraint

Flue's HTTP API only exposes `POST /agents/:name/:id` and
`POST /workflows/:name` — there is **no HTTP endpoint to delete a session**.
`sessions.delete()` exists only inside the agent process. That shapes the
"delete thread" design (see Phase 6).

---

## Phase 1 — DB schema (`packages/db/src/schema/index.ts`)

Add two tables + relations, then generate a migration.

```ts
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull().default('New chat'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('conversations_user_id_idx').on(t.userId),
  index('conversations_user_id_last_message_idx').on(t.userId, t.lastMessageAt),
]);

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),            // raw text/markdown
  contentHtml: text('content_html'),             // sanitized html (assistant only)
  attachmentNames: jsonb('attachment_names').$type<string[]>(), // display only, nullable
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('messages_conversation_id_idx').on(t.conversationId),
  index('messages_conversation_created_idx').on(t.conversationId, t.createdAt),
]);
```

- Add `conversationsRelations` / `messagesRelations`, register both in the
  exported `schema` object, and export
  `Conversation`/`NewConversation`/`Message`/`NewMessage` types (mirrors the
  existing pattern).
- The Flue instance id is **derived, not stored**:
  `` `${userId}::${conversationId}` `` (deterministic → no extra column).
- `bun run db:generate` → new `packages/db/src/migrations/0002_*.sql`; run
  `bun run db:migrate`.

## Phase 2 — DB queries (`packages/db/src/queries/conversations.ts`)

Mirror `expenses.ts`/`categories.ts` (Zod-validated `userId`, user-scoped
`where`):

- `listConversations(userId)` → ordered by `lastMessageAt desc`
- `createConversation(userId, { title? })` → returns row
- `getConversationById(userId, id)`
- `renameConversation(userId, id, title)`
- `deleteConversation(userId, id)` → returns deleted row (messages cascade)
- `listMessages(userId, conversationId)` → asc by `createdAt` (guard that
  conversation belongs to user)
- `addMessage(userId, conversationId, { role, content, contentHtml?, attachmentNames? })`
  → inserts message **and** bumps `conversations.lastMessageAt`/`updatedAt`
  (single transaction)

## Phase 3 — Agent session keying (`apps/agent/src/agents/bookkeeper.ts`)

```ts
export default createAgent(({ id: instanceId }) => {
  const userId = instanceId.split('::')[0]; // back-compat: plain id → whole string
  return { model: env.AGENT_MODEL, instructions: …, skills: […], tools: bookkeeperTools(userId) };
});
```

Tools stay scoped to the real user; each `conversationId` gets an isolated Flue
conversation/memory. No tool code changes.

## Phase 4 — Web server functions

**New `apps/web/src/server/conversations.ts`** (each wraps `ensureSession()`
like `expenses.ts`): `listConversations`, `createConversation`,
`renameConversation`, `deleteConversation`, `listMessages`.

**Update `apps/web/src/server/chat.ts`** — `sendChatMessage`:
1. Add required `conversationId: z.uuid()` to input; verify it belongs to the
   user.
2. Persist the **user** message (`content`, `attachmentNames`) before calling
   the agent.
3. Call
   `client.agents.prompt('bookkeeper', `${session.user.id}::${conversationId}`, …)`
   (composite id).
4. Persist the **assistant** message (`content` + `contentHtml`).
5. If the conversation still has the default title, derive one from the first
   user message (e.g. first ~48 chars) via `renameConversation`.
6. Return `{ message, messageHtml }` as today.

## Phase 5 — Chat UI (threads)

- **Routes:** convert `/_authenticated/chat.tsx` into a layout with a thread
  sidebar + `` `/_authenticated/chat/$conversationId.tsx` `` for the active
  thread; index `/chat` redirects to the most recent thread or shows an empty
  state with "New chat".
- **Sidebar component** (`components/chat/chat-sidebar.tsx`): lists
  conversations (React Query key `['conversations']`), **New chat** button
  (`createConversation` → navigate to it), per-row **rename** (inline) and
  **delete** (confirm dialog, reuse the existing `delete-*-dialog` pattern).
- **`ChatShell` changes:** takes a `conversationId` prop; replaces local-only
  `messages` state — seeds from `listMessages` (React Query key
  `['messages', conversationId]`) and appends optimistically on send. Existing
  attachment/markdown/`sendChatMessage` logic is preserved; the mutation now
  passes `conversationId` and invalidates `['messages', id]` + `['conversations']`
  (for reordering/title).
- Delete flow: `deleteConversation` → invalidate `['conversations']` → navigate
  to next thread or empty state.

## Phase 6 (optional) — Clean up Flue state on delete

**Decision: Option A — leave orphaned (done).** Deleting a thread hard-deletes
the app's `conversations` + `messages` rows; the matching Flue state
(`flue_sessions` / `flue_session_entries` / `flue_image_chunks`, keyed by
`` `${userId}::${conversationId}` ``) is intentionally left behind.

Why not clean it up now (verified against runtime beta.7/.9):

- Flue mounts only `POST/GET /agents/:name/:id` and `POST /workflows/:name` —
  **no HTTP/session-delete endpoint**, and the SDK client exposes no delete.
- `sessions.delete()` is **in-process only** (on `FlueHarness.sessions`); you
  only hold a harness for the current invocation's id, not an arbitrary one.
- **Direct SQL by key is unreliable**: `flue_sessions.id` is an opaque internal
  identity (not the composite instance id), and the vendor warns against
  touching these tables.

Safe because composite keys are unique and never reused, so orphans never
collide with new threads. The main cost is orphaned receipt **image chunks**.

Marked with a `TODO` at the `deleteConversation` server function to reclaim Flue
state once the runtime exposes session deletion (it's beta; likely to land). If
reclamation is needed sooner, run it as a verified spike (custom
`apps/agent/src/app.ts` Hono `DELETE` route, or a tested direct-table cleanup).

## Phase 7 — Verification

`bun run db:migrate` → typecheck → Biome check/lint → build. Manual: create /
list / rename / delete threads; confirm each thread has independent memory;
confirm history survives reload; confirm `/expenses` + `/categories` still work.

---

## Files touched

| Action | Path |
|--------|------|
| edit | `packages/db/src/schema/index.ts` |
| add | `packages/db/src/migrations/0002_*.sql` (generated) |
| add | `packages/db/src/queries/conversations.ts` |
| edit | `apps/agent/src/agents/bookkeeper.ts` |
| add | `apps/web/src/server/conversations.ts` |
| edit | `apps/web/src/server/chat.ts` |
| edit | `apps/web/src/routes/_authenticated/chat.tsx` (+ add `chat/$conversationId.tsx`) |
| add | `apps/web/src/components/chat/chat-sidebar.tsx` |
| edit | `apps/web/src/components/chat/chat-shell.tsx` |

**Out of scope:** streaming responses, storing receipt bytes, Flue-state
deletion (Phase 6 optional), message editing/regeneration.
