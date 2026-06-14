import { relations } from 'drizzle-orm';
import {
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	slug: varchar('slug', { length: 100 }).notNull().unique(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const expenses = pgTable(
	'expenses',
	{
		id: uuid('id').defaultRandom().primaryKey(),
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
		index('expenses_date_idx').on(table.date),
		index('expenses_category_id_idx').on(table.categoryId),
		index('expenses_vendor_idx').on(table.vendor),
	]
);

export const categoriesRelations = relations(categories, ({ many }) => ({
	expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
	category: one(categories, {
		fields: [expenses.categoryId],
		references: [categories.id],
	}),
}));

export const schema = {
	categories,
	categoriesRelations,
	expenses,
	expensesRelations,
};

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
