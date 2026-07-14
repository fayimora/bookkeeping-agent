import { defineRelations } from 'drizzle-orm';

import { schema } from './schema';

/**
 * Drizzle v1 relational-query metadata (RQB v2 `defineRelations` API).
 *
 * The old `relations()` helper was removed in drizzle-orm v1. Nothing in the
 * codebase uses the relational query builder today, but the relation graph is
 * preserved here so `db.query` / `PgDrizzle.make({ relations })` can be adopted
 * later without re-deriving it.
 */
export const relations = defineRelations(schema, (r) => ({
	accounts: {
		user: r.one.users({
			from: r.accounts.userId,
			to: r.users.id,
		}),
	},
	categories: {
		expenses: r.many.expenses(),
		user: r.one.users({
			from: r.categories.userId,
			to: r.users.id,
		}),
	},
	conversations: {
		messages: r.many.messages(),
		user: r.one.users({
			from: r.conversations.userId,
			to: r.users.id,
		}),
	},
	expenses: {
		category: r.one.categories({
			from: r.expenses.categoryId,
			to: r.categories.id,
		}),
		user: r.one.users({
			from: r.expenses.userId,
			to: r.users.id,
		}),
	},
	messages: {
		conversation: r.one.conversations({
			from: r.messages.conversationId,
			to: r.conversations.id,
		}),
		user: r.one.users({
			from: r.messages.userId,
			to: r.users.id,
		}),
	},
	sessions: {
		user: r.one.users({
			from: r.sessions.userId,
			to: r.users.id,
		}),
	},
	users: {
		accounts: r.many.accounts(),
		categories: r.many.categories(),
		conversations: r.many.conversations(),
		expenses: r.many.expenses(),
		messages: r.many.messages(),
		sessions: r.many.sessions(),
	},
}));
