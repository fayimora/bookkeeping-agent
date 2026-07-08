import { env } from '@bookeeping-agent/env/db';
import { drizzle } from 'drizzle-orm/node-postgres';

import { schema } from './schema';

export function createDb() {
	return drizzle(env.DATABASE_URL, { schema });
}

export const db = createDb();
