import { Effect, Schema } from 'effect';
import { isSqlError, type SqlError } from 'effect/unstable/sql/SqlError';

export class DbError extends Schema.TaggedErrorClass<DbError>()('DbError', {
	cause: Schema.Defect(),
	operation: Schema.String,
}) {}

export const dbError =
	(operation: string) =>
	<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, DbError, R> =>
		Effect.mapError(effect, (cause) => DbError.make({ cause, operation }));

export const missingRow = (operation: string) =>
	DbError.make({
		cause: new Error('Database mutation returned no row.'),
		operation,
	});

/** Map a transaction's own SqlError (begin/commit) while keeping domain errors. */
export const transactionError =
	(operation: string) =>
	<A, E, R>(
		effect: Effect.Effect<A, E | SqlError, R>
	): Effect.Effect<A, DbError | E, R> =>
		Effect.mapError(effect, (error) =>
			isSqlError(error) ? DbError.make({ cause: error, operation }) : error
		);
