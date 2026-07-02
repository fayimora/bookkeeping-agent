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
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified')
		.$defaultFn(() => false)
		.notNull(),
	image: text('image'),
	createdAt: timestamp('created_at', { withTimezone: true })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const sessions = pgTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		ipAddress: text('ip_address'),
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
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', {
			withTimezone: true,
		}),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
			withTimezone: true,
		}),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [index('accounts_user_id_idx').on(table.userId)]
);

export const verifications = pgTable('verifications', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(
		() => new Date()
	),
	updatedAt: timestamp('updated_at', { withTimezone: true }).$defaultFn(
		() => new Date()
	),
});

export const categories = pgTable(
	'categories',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 100 }).notNull(),
		slug: varchar('slug', { length: 100 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index('categories_user_id_idx').on(table.userId),
		uniqueIndex('categories_user_id_slug_unique').on(table.userId, table.slug),
	]
);

export const expenses = pgTable(
	'expenses',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		vendor: varchar('vendor', { length: 200 }).notNull(),
		date: date('date').notNull(),
		amountCents: integer('amount_cents').notNull(),
		currency: varchar('currency', { length: 3 }).default('GBP').notNull(),
		categoryId: uuid('category_id').references(() => categories.id, {
			onDelete: 'set null',
		}),
		description: text('description'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
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
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 200 }).notNull().default('New chat'),
		lastMessageAt: timestamp('last_message_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
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
		id: uuid('id').defaultRandom().primaryKey(),
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: varchar('role', { length: 16 }).notNull(),
		content: text('content').notNull(),
		contentHtml: text('content_html'),
		attachmentNames: jsonb('attachment_names').$type<string[]>(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
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
