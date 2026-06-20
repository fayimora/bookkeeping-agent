import { hashPassword } from 'better-auth/crypto';
import { drizzle } from 'drizzle-orm/node-postgres';

import { accounts, categories, users } from './schema';

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
}

console.log(
	`Seeded ${seededUsers.length} users and ${defaultCategories.length} default categories per user.`
);
