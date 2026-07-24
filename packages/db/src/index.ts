// biome-ignore-all lint/performance/noBarrelFile: This is the package's intentional public API and retained better-auth entrypoint.
import { env } from '@bookeeping-agent/env/db';
import { drizzle } from 'drizzle-orm/node-postgres';

import { relations } from './relations';

export { Database, DbLive, PgClientLive } from './database';
export { DbError } from './errors';
export * from './repositories';
export { RepositoriesLive } from './runtime';

export function createDb() {
	return drizzle(env.DATABASE_URL, { relations });
}

export const db = createDb();
