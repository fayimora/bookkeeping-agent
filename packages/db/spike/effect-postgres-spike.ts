/**
 * Chunk 0 spike — throwaway.
 *
 * Verifies, against the real docker postgres:
 *   1. PgDrizzle.make({ relations }) over PgClient.layer runs real queries
 *   2. the date/time type-parser shim returns raw strings (drizzle parses)
 *   3. Effect-native transactions: rollback on failure, commit on success
 */
import { PgClient } from '@effect/sql-pg';
import { and, eq } from 'drizzle-orm';
import {
	make as makePgDrizzle,
	DefaultServices as PgDrizzleDefaultServices,
} from 'drizzle-orm/effect-postgres';
import { Config, Data, Effect, Layer } from 'effect';
import { types } from 'pg';

import { relations } from '../src/relations';
import { categories, expenses, users } from '../src/schema';

// Date/time OIDs must come back as raw strings so drizzle does the parsing
// (per https://orm.drizzle.team/docs/connect-effect-postgres).
const RAW_DATE_TIME_OIDS = new Set([
	1184, 1114, 1082, 1186, 1231, 1115, 1185, 1187, 1182,
]);

const PgClientLive = Layer.unwrap(
	Effect.map(Config.redacted('DATABASE_URL'), (url) =>
		PgClient.layer({
			types: {
				getTypeParser: (typeId: number, format?: string) => {
					if (RAW_DATE_TIME_OIDS.has(typeId)) {
						return (value: string) => value;
					}
					// biome-ignore lint/suspicious/noExplicitAny: pg's overloaded signature; spike-only code
					return types.getTypeParser(typeId as any, format as any);
				},
			},
			url,
		})
	)
);

const dbEffect = makePgDrizzle({ relations }).pipe(
	Effect.provide(PgDrizzleDefaultServices)
);

class Rollback extends Data.TaggedError('Rollback') {}

const program = Effect.gen(function* () {
	const db = yield* dbEffect;

	// --- 1. plain select -----------------------------------------------------
	const rows = yield* db
		.select({
			amountCents: expenses.amountCents,
			createdAt: expenses.createdAt,
			date: expenses.date,
			id: expenses.id,
			vendor: expenses.vendor,
		})
		.from(expenses)
		.limit(2);
	yield* Effect.log(`select ok: ${rows.length} rows`);
	if (rows.length > 0) {
		const [first] = rows;
		yield* Effect.log(
			`date field: ${JSON.stringify(first?.date)} (typeof ${typeof first?.date})`
		);
		yield* Effect.log(
			`createdAt field: ${String(first?.createdAt)} (instanceof Date: ${first?.createdAt instanceof Date})`
		);
	}

	const [alice] = yield* db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.id, 'seed-user-alice'))
		.limit(1);
	if (!alice) {
		return yield* Effect.die(new Error('seed user missing — run bun db:seed'));
	}

	// --- 2. transaction rollback ----------------------------------------------
	const rollbackProbe = db.transaction((tx) =>
		Effect.gen(function* () {
			yield* tx.insert(categories).values({
				name: 'Spike Rollback',
				slug: 'spike-rollback',
				userId: alice.id,
			});
			return yield* Effect.fail(new Rollback());
		})
	);
	const rollbackExit = yield* Effect.exit(rollbackProbe);
	yield* Effect.log(`transaction failed as expected: ${rollbackExit._tag}`);

	const leaked = yield* db
		.select({ id: categories.id })
		.from(categories)
		.where(
			and(
				eq(categories.slug, 'spike-rollback'),
				eq(categories.userId, alice.id)
			)
		);
	yield* Effect.log(
		leaked.length === 0
			? 'rollback verified: no leaked row'
			: `ROLLBACK FAILED: leaked ${leaked.length} row(s)`
	);

	// --- 3. transaction commit (check-then-act inside one tx) -----------------
	const committed = yield* db.transaction((tx) =>
		Effect.gen(function* () {
			const [inserted] = yield* tx
				.insert(categories)
				.values({
					name: 'Spike Commit',
					slug: 'spike-commit',
					userId: alice.id,
				})
				.returning({ id: categories.id });
			return inserted;
		})
	);
	yield* Effect.log(`commit verified: category ${committed?.id}`);

	// cleanup
	yield* db
		.delete(categories)
		.where(
			and(eq(categories.slug, 'spike-commit'), eq(categories.userId, alice.id))
		);
	yield* Effect.log('spike complete');
});

Effect.runPromise(program.pipe(Effect.provide(PgClientLive))).catch((error) => {
	console.error('SPIKE FAILED', error);
	process.exitCode = 1;
});
