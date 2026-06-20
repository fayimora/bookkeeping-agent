# Better Auth seeded users design

## Goal

Add real authentication to the bookkeeping app while keeping account creation closed. The app will support exactly three seeded demo users: Alice, Bob, and Charlie. Users sign in with email/password credentials derived from their names, and each user gets a separate bookkeeping ledger.

## Auth model

Use Better Auth with email/password enabled and public signups disabled. Seeded usernames are exposed in the UI as `alice`, `bob`, and `charlie`, while the auth backend can use deterministic local email addresses:

- `alice@bookkeeping.local` / `alicepassword`
- `bob@bookkeeping.local` / `bobpassword`
- `charlie@bookkeeping.local` / `charliepassword`

Better Auth owns password hashing, credential verification, and session cookies. The app mounts Better Auth's TanStack Start handler under `/api/auth/$` and uses the TanStack cookie integration plugin.

## Data isolation

Each authenticated user has an independent ledger. Expenses and categories are owned by a user. Server-side code derives the `userId` from the authenticated session and never accepts a user ID from client input.

Schema changes:

- Add Better Auth tables for users, sessions, accounts, and verifications.
- Add `userId` to `expenses`.
- Add `userId` to `categories`.
- Change category slug uniqueness from global uniqueness to per-user uniqueness.
- Add indexes for user-scoped expense/category queries.

The seed script creates the three users and default categories for each user.

## Route and UI behavior

Add a `/login` page with username and password fields. The username field accepts `alice`, `bob`, or `charlie` and maps to the local auth email. Unauthenticated users are redirected to `/login` before accessing `/expenses`, `/categories`, or `/chat`.

The header shows the signed-in user and a logout button. Login and logout should invalidate client auth state and route users to the expected page.

## Server behavior

Create shared auth helpers:

- `getSession()` returns the current Better Auth session.
- `ensureSession()` returns a session or throws unauthorized.
- Query/server function helpers expose the authenticated user's ID.

Every protected server function calls `ensureSession()` before database access. Expense and category functions pass the session user ID into DB query functions, and DB query functions filter or mutate only rows owned by that user.

Chat also requires a session. If the agent creates bookkeeping records, that path must be user-scoped as well.

## Implementation plan

1. Add Better Auth dependencies.
2. Add Better Auth server/client config.
3. Add Better Auth route handler.
4. Extend Drizzle schema with auth tables and user ownership.
5. Update database query APIs to require user IDs.
6. Update TanStack Start server functions to require sessions.
7. Add the login page and header user/logout UI.
8. Update seed script and README.
9. Run typecheck/build and fix issues.

## Testing

Verify that:

- Seed creates Alice, Bob, Charlie and per-user categories.
- Alice can sign in with `alicepassword`.
- Wrong passwords fail.
- Protected pages redirect to `/login` when signed out.
- Alice cannot see Bob's expenses or categories.
- Creating/updating/deleting expenses and categories stays scoped to the signed-in user.
- Logout clears access to protected routes.
