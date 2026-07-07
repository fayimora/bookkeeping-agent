import { relations } from 'drizzle-orm';
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	createdAt: timestamp('created_at', { withTimezone: true })
		.$defaultFn(() => new Date())
		.notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified')
		.$defaultFn(() => false)
		.notNull(),
	id: text('id').primaryKey(),
	image: text('image'),
	name: text('name').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const sessions = pgTable(
	'sessions',
	{
		createdAt: timestamp('created_at', { withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		id: text('id').primaryKey(),
		ipAddress: text('ip_address'),
		token: text('token').notNull().unique(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
	},
	(table) => [index('sessions_user_id_idx').on(table.userId)]
);

export const accounts = pgTable(
	'accounts',
	{
		accessToken: text('access_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', {
			withTimezone: true,
		}),
		accountId: text('account_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		id: text('id').primaryKey(),
		idToken: text('id_token'),
		password: text('password'),
		providerId: text('provider_id').notNull(),
		refreshToken: text('refresh_token'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
			withTimezone: true,
		}),
		scope: text('scope'),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
	},
	(table) => [index('accounts_user_id_idx').on(table.userId)]
);

export const verifications = pgTable('verifications', {
	createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(
		() => new Date()
	),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).$defaultFn(
		() => new Date()
	),
	value: text('value').notNull(),
});

export const categories = pgTable(
	'categories',
	{
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		id: uuid('id').defaultRandom().primaryKey(),
		name: varchar('name', { length: 100 }).notNull(),
		slug: varchar('slug', { length: 100 }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
	},
	(table) => [
		index('categories_user_id_idx').on(table.userId),
		uniqueIndex('categories_user_id_slug_unique').on(table.userId, table.slug),
	]
);

export const expenses = pgTable(
	'expenses',
	{
		amountCents: integer('amount_cents').notNull(),
		categoryId: uuid('category_id').references(() => categories.id, {
			onDelete: 'set null',
		}),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		currency: varchar('currency', { length: 3 }).default('GBP').notNull(),
		date: date('date').notNull(),
		description: text('description'),
		id: uuid('id').defaultRandom().primaryKey(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		vendor: varchar('vendor', { length: 200 }).notNull(),
	},
	(table) => [
		index('expenses_user_id_idx').on(table.userId),
		index('expenses_user_id_date_idx').on(table.userId, table.date),
		index('expenses_category_id_idx').on(table.categoryId),
		index('expenses_vendor_idx').on(table.vendor),
	]
);

export const conversations = pgTable(
	'conversations',
	{
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		id: uuid('id').defaultRandom().primaryKey(),
		lastMessageAt: timestamp('last_message_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		title: varchar('title', { length: 200 }).notNull().default('New chat'),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
	},
	(table) => [
		index('conversations_user_id_idx').on(table.userId),
		index('conversations_user_id_last_message_idx').on(
			table.userId,
			table.lastMessageAt
		),
	]
);

export const messages = pgTable(
	'messages',
	{
		attachmentNames: jsonb('attachment_names').$type<string[]>(),
		content: text('content').notNull(),
		contentHtml: text('content_html'),
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		id: uuid('id').defaultRandom().primaryKey(),
		role: varchar('role', { length: 16 }).notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
	},
	(table) => [
		index('messages_conversation_id_idx').on(table.conversationId),
		index('messages_conversation_created_idx').on(
			table.conversationId,
			table.createdAt
		),
	]
);

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	categories: many(categories),
	conversations: many(conversations),
	expenses: many(expenses),
	messages: many(messages),
	sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

export const categoriesRelations = relations(categories, ({ many, one }) => ({
	expenses: many(expenses),
	user: one(users, {
		fields: [categories.userId],
		references: [users.id],
	}),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
	category: one(categories, {
		fields: [expenses.categoryId],
		references: [categories.id],
	}),
	user: one(users, {
		fields: [expenses.userId],
		references: [users.id],
	}),
}));

export const conversationsRelations = relations(
	conversations,
	({ many, one }) => ({
		messages: many(messages),
		user: one(users, {
			fields: [conversations.userId],
			references: [users.id],
		}),
	})
);

export const messagesRelations = relations(messages, ({ one }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
	}),
	user: one(users, {
		fields: [messages.userId],
		references: [users.id],
	}),
}));

export const schema = {
	accounts,
	accountsRelations,
	categories,
	categoriesRelations,
	conversations,
	conversationsRelations,
	expenses,
	expensesRelations,
	messages,
	messagesRelations,
	sessions,
	sessionsRelations,
	users,
	usersRelations,
	verifications,
};

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
