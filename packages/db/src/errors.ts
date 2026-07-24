import { Effect, Schema } from 'effect';

export class DbError extends Schema.TaggedErrorClass<DbError>()('DbError', {
	cause: Schema.Defect(),
	operation: Schema.String,
}) {}

export const dbError =
	(operation: string) =>
	<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, DbError, R> =>
		Effect.mapError(effect, (cause) => DbError.make({ cause, operation }));
