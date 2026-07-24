import { DatabaseConfig } from '@bookeeping-agent/env/database';
import { PgClient } from '@effect/sql-pg';
import {
	make as makePgDrizzle,
	DefaultServices as PgDrizzleDefaultServices,
} from 'drizzle-orm/effect-postgres';
import { Context, Effect, Layer } from 'effect';
import type { CustomTypesConfig } from 'pg';
import { types } from 'pg';

import { relations } from './relations';

const rawDateTimeOids = new Set([
	1184, 1114, 1082, 1186, 1231, 1115, 1185, 1187, 1182,
]);

const rawStringParser = (value: string) => value;

const getTypeParser: CustomTypesConfig['getTypeParser'] = (typeId, format) => {
	if (rawDateTimeOids.has(Number(typeId))) {
		return rawStringParser;
	}

	return types.getTypeParser(typeId, format);
};

const postgresTypes: CustomTypesConfig = { getTypeParser };

export const PgClientLive = Layer.unwrap(
	Effect.map(DatabaseConfig.url, (url) =>
		PgClient.layer({ types: postgresTypes, url })
	)
);

const makeDatabase = makePgDrizzle({ relations }).pipe(
	Effect.provide(PgDrizzleDefaultServices)
);

export type DatabaseService = Effect.Success<typeof makeDatabase>;

export class Database extends Context.Service<Database, DatabaseService>()(
	'@bookeeping-agent/db/Database'
) {}

export const DbLive = Layer.effect(Database, makeDatabase);
