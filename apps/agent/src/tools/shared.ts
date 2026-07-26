import type {
	CategoriesRepo,
	ConversationsRepo,
	DbError,
	ExpensesRepo,
} from '@bookeeping-agent/db';
import type {
	CategoryNotFound,
	CategoryNotOwned,
	ConflictingUpdate,
	EmptyUpdate,
	ExpenseNotFound,
} from '@bookeeping-agent/domain';
import { Effect, Schedule, type Schema } from 'effect';
import { isSqlError } from 'effect/unstable/sql/SqlError';

import { agentRuntime } from '../runtime.ts';

export type ToolFailure =
	| CategoryNotFound
	| CategoryNotOwned
	| ConflictingUpdate
	| DbError
	| EmptyUpdate
	| ExpenseNotFound
	| Schema.SchemaError;

type AgentService = CategoriesRepo | ConversationsRepo | ExpensesRepo;

const transientReadSchedule = Schedule.exponential('50 millis').pipe(
	Schedule.jittered,
	Schedule.upTo({ times: 2 })
);

function isTransientDatabaseError(error: ToolFailure) {
	return (
		error._tag === 'DbError' &&
		isSqlError(error.cause) &&
		error.cause.isRetryable
	);
}

/** Retry only idempotent reads with explicitly retryable SQL failures. */
export const retryTransientRead = <A, R>(
	effect: Effect.Effect<A, ToolFailure, R>
) =>
	effect.pipe(
		Effect.retry({
			schedule: transientReadSchedule,
			while: isTransientDatabaseError,
		})
	);

const modelFriendlyErrors = <A, R>(effect: Effect.Effect<A, ToolFailure, R>) =>
	effect.pipe(
		Effect.catchTags({
			CategoryNotFound: (error) =>
				Effect.fail(new Error(`No category matched ${error.identifier}.`)),
			CategoryNotOwned: () =>
				Effect.fail(new Error('That category is not available to this user.')),
			ConflictingUpdate: (error) =>
				Effect.fail(
					new Error(
						`Use either clear${error.field === 'category' ? 'Category' : 'Description'} or a new ${error.field} value, not both.`
					)
				),
			DbError: () =>
				Effect.fail(
					new Error('The bookkeeping database is temporarily unavailable.')
				),
			EmptyUpdate: (error) =>
				Effect.fail(
					new Error(`Provide at least one ${error.entity} field to update.`)
				),
			ExpenseNotFound: () => Effect.fail(new Error('Expense not found.')),
			SchemaError: (error) =>
				Effect.fail(new Error(`Invalid tool input: ${error.message}`)),
		})
	);

/** Run an Effect tool workflow at the Flue boundary with real cancellation. */
export function runToolEffect<A, R extends AgentService>(
	effect: Effect.Effect<A, ToolFailure, R>,
	signal?: AbortSignal
) {
	return agentRuntime.runPromise(modelFriendlyErrors(effect), { signal });
}
