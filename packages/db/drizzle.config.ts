import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dbCredentials: {
		url: process.env.DATABASE_URL || '',
	},
	dialect: 'postgresql',
	out: './src/migrations',
	schema: './src/schema',
	// Flue's conversation store manages its own tables in the same database;
	// keep drizzle-kit push from trying to drop them (v1 push prompts for
	// data loss on tables it does not own).
	tablesFilter: ['!flue_*'],
});
