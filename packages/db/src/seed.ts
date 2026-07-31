import { hashPassword } from 'better-auth/crypto';
import { eq, sql } from 'drizzle-orm';
import { Effect, Layer, Logger, Schema } from 'effect';

import { Database, DbLive, PgClientLive } from './database';
import { accounts, categories, expenses, users } from './schema';
import { aliceExpenses } from './seed-data/alice-expenses';

class SeedError extends Schema.TaggedErrorClass<SeedError>()('SeedError', {
	cause: Schema.Defect(),
	operation: Schema.String,
}) {}

const seededUsers = [
	{
		email: 'alice@bookkeeping.local',
		id: 'seed-user-alice',
		name: 'Alice',
		password: 'alicepassword',
	},
	{
		email: 'bob@bookkeeping.local',
		id: 'seed-user-bob',
		name: 'Bob',
		password: 'bobpassword',
	},
	{
		email: 'charlie@bookkeeping.local',
		id: 'seed-user-charlie',
		name: 'Charlie',
		password: 'charliepassword',
	},
];

const defaultCategories = [
	{ name: 'Food', slug: 'food' },
	{ name: 'Travel', slug: 'travel' },
	{ name: 'Software', slug: 'software' },
	{ name: 'Office', slug: 'office' },
	{ name: 'Utilities', slug: 'utilities' },
	{ name: 'Entertainment', slug: 'entertainment' },
	{ name: 'Other', slug: 'other' },
];

const seedDatabase = Effect.fn('Database.seed')(function* () {
	const db = yield* Database;

	for (const user of seededUsers) {
		yield* db
			.insert(users)
			.values({
				email: user.email,
				emailVerified: true,
				id: user.id,
				name: user.name,
			})
			.onConflictDoUpdate({
				set: {
					email: user.email,
					emailVerified: true,
					name: user.name,
					updatedAt: new Date(),
				},
				target: users.id,
			});

		const password = yield* Effect.tryPromise({
			catch: (cause) =>
				SeedError.make({ cause, operation: 'Database.seed.hashPassword' }),
			try: () => hashPassword(user.password),
		});

		yield* db
			.insert(accounts)
			.values({
				accountId: user.id,
				id: `seed-account-${user.id}`,
				password,
				providerId: 'credential',
				userId: user.id,
			})
			.onConflictDoUpdate({
				set: {
					accountId: user.id,
					password,
					providerId: 'credential',
					updatedAt: new Date(),
					userId: user.id,
				},
				target: accounts.id,
			});

		yield* db
			.insert(categories)
			.values(
				defaultCategories.map((category) => ({
					...category,
					userId: user.id,
				}))
			)
			.onConflictDoNothing({
				target: [categories.userId, categories.slug],
			});

		if (user.id === 'seed-user-alice') {
			const aliceCategories = yield* db
				.select()
				.from(categories)
				.where(eq(categories.userId, user.id));
			const categoryIdsBySlug = new Map(
				aliceCategories.map((category) => [category.slug, category.id])
			);
			const aliceExpenseValues = yield* Effect.forEach(
				aliceExpenses,
				Effect.fn('Database.seed.resolveExpenseCategory')(function* (expense) {
					const categoryId = categoryIdsBySlug.get(expense.categorySlug);

					if (categoryId === undefined) {
						return yield* SeedError.make({
							cause: new Error(
								`Missing category for Alice expense: ${expense.categorySlug}`
							),
							operation: 'Database.seed.resolveExpenseCategory',
						});
					}

					return {
						amountCents: expense.amountCents,
						categoryId,
						currency: 'GBP',
						date: expense.date,
						description: expense.description,
						id: expense.id,
						userId: user.id,
						vendor: expense.vendor,
					};
				})
			);

			yield* db
				.insert(expenses)
				.values(aliceExpenseValues)
				.onConflictDoUpdate({
					set: {
						amountCents: sql`excluded.amount_cents`,
						categoryId: sql`excluded.category_id`,
						currency: sql`excluded.currency`,
						date: sql`excluded.date`,
						description: sql`excluded.description`,
						updatedAt: new Date(),
						userId: sql`excluded.user_id`,
						vendor: sql`excluded.vendor`,
					},
					target: expenses.id,
				});
		}
	}

	yield* Effect.logInfo('Database seed complete', {
		defaultCategoryCount: defaultCategories.length,
		expenseCount: aliceExpenses.length,
		userCount: seededUsers.length,
	});
});

const SeedDatabaseLive = DbLive.pipe(Layer.provide(PgClientLive));
const JsonLoggerLive = Logger.layer([Logger.consoleJson]);

await Effect.runPromise(
	seedDatabase().pipe(
		Effect.provide(SeedDatabaseLive),
		Effect.provide(JsonLoggerLive)
	)
);
