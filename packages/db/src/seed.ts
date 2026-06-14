import { drizzle } from 'drizzle-orm/node-postgres';

import { categories } from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error('DATABASE_URL is required to seed the database.');
}

const db = drizzle(databaseUrl);

const defaultCategories = [
	{ name: 'Food', slug: 'food' },
	{ name: 'Travel', slug: 'travel' },
	{ name: 'Software', slug: 'software' },
	{ name: 'Office', slug: 'office' },
	{ name: 'Utilities', slug: 'utilities' },
	{ name: 'Entertainment', slug: 'entertainment' },
	{ name: 'Other', slug: 'other' },
];

await db
	.insert(categories)
	.values(defaultCategories)
	.onConflictDoNothing({ target: categories.slug });

console.log(`Seeded ${defaultCategories.length} default categories.`);
