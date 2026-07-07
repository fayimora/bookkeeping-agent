import { hashPassword } from 'better-auth/crypto';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

import { accounts, categories, expenses, users } from './schema';
import { aliceExpenses } from './seed-data/alice-expenses';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error('DATABASE_URL is required to seed the database.');
}

const db = drizzle(databaseUrl);

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

for (const user of seededUsers) {
	// biome-ignore lint/performance/noAwaitInLoops: Seed writes depend on each user's rows existing before related rows.
	await db
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

	await db
		.insert(accounts)
		.values({
			accountId: user.id,
			id: `seed-account-${user.id}`,
			password: await hashPassword(user.password),
			providerId: 'credential',
			userId: user.id,
		})
		.onConflictDoUpdate({
			set: {
				accountId: user.id,
				password: await hashPassword(user.password),
				providerId: 'credential',
				updatedAt: new Date(),
				userId: user.id,
			},
			target: accounts.id,
		});

	await db
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
		const aliceCategories = await db
			.select()
			.from(categories)
			.where(eq(categories.userId, user.id));
		const categoryIdsBySlug = new Map(
			aliceCategories.map((category) => [category.slug, category.id])
		);

		const aliceExpenseValues = aliceExpenses.map((expense) => {
			const categoryId = categoryIdsBySlug.get(expense.categorySlug);

			if (!categoryId) {
				throw new Error(
					`Missing category for Alice expense: ${expense.categorySlug}`
				);
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
		});

		await db
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

console.log(
	`Seeded ${seededUsers.length} users, ${defaultCategories.length} default categories per user, and ${aliceExpenses.length} expenses for Alice.`
);
