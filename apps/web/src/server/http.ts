import type {
	CategoriesRepo,
	ConversationsRepo,
	DbError,
	ExpensesRepo,
} from '@bookeeping-agent/db';
import {
	type CategoryNotFound,
	type CategoryNotOwned,
	type ConflictingUpdate,
	type ConversationNotFound,
	type EmptyUpdate,
	type ExpenseNotFound,
	UserId,
} from '@bookeeping-agent/domain';
import {
	getRequestHeaders,
	setResponseStatus,
} from '@tanstack/react-start/server';
import {
	Cause,
	Effect,
	Exit,
	type ManagedRuntime,
	Option,
	Schema,
} from 'effect';

import {
	BetterAuth,
	type BetterAuthError,
	CurrentUser,
	Unauthorized,
} from './auth';
import type {
	AgentResponseError,
	BookkeeperClient,
	BookkeeperClientError,
} from './bookkeeper-client';
import { webRuntime } from './runtime';

export type WebServices =
	| BetterAuth
	| BookkeeperClient
	| CategoriesRepo
	| ConversationsRepo
	| ExpensesRepo;

interface HttpFailure {
	readonly message: string;
	readonly status: number;
}

const internalServerError: HttpFailure = {
	message: 'Internal server error.',
	status: 500,
};

/** Every typed failure a server function may surface; runners reject others. */
export type ApplicationError =
	| AgentResponseError
	| BetterAuthError
	| BookkeeperClientError
	| CategoryNotFound
	| CategoryNotOwned
	| ConflictingUpdate
	| ConversationNotFound
	| DbError
	| EmptyUpdate
	| ExpenseNotFound
	| Schema.SchemaError
	| Unauthorized;

const notFound: HttpFailure = { message: 'Resource not found.', status: 404 };
const conflict: HttpFailure = {
	message: 'Request conflicts with current state.',
	status: 409,
};
const agentUnavailable: HttpFailure = {
	message: 'Bookkeeper agent is unavailable.',
	status: 502,
};

// A mapped type over the tags, so adding an error to the union without a
// status here is a compile error.
const failureByTag: {
	readonly [Tag in ApplicationError['_tag']]: HttpFailure;
} = {
	AgentResponseError: agentUnavailable,
	BetterAuthError: internalServerError,
	BookkeeperClientError: agentUnavailable,
	CategoryNotFound: notFound,
	CategoryNotOwned: conflict,
	ConflictingUpdate: conflict,
	ConversationNotFound: notFound,
	DbError: internalServerError,
	EmptyUpdate: conflict,
	ExpenseNotFound: notFound,
	SchemaError: internalServerError,
	Unauthorized: { message: 'Unauthorized.', status: 401 },
};

const isApplicationError = (error: unknown): error is ApplicationError =>
	typeof error === 'object' &&
	error !== null &&
	'_tag' in error &&
	typeof error._tag === 'string' &&
	Object.hasOwn(failureByTag, error._tag);

export function classifyApplicationError(error: unknown): HttpFailure {
	return isApplicationError(error)
		? failureByTag[error._tag]
		: internalServerError;
}

const completeHttpExit = <A, E>(exit: Exit.Exit<A, E>): A => {
	if (Exit.isSuccess(exit)) {
		return exit.value;
	}
	if (Cause.hasInterrupts(exit.cause)) {
		throw Cause.squash(exit.cause);
	}

	const applicationError = Cause.findErrorOption(exit.cause);
	const failure = Option.isSome(applicationError)
		? classifyApplicationError(applicationError.value)
		: internalServerError;
	setResponseStatus(failure.status);
	throw new Error(failure.message);
};

export const makeWebEffectRunner = <R, ER>(
	runtime: ManagedRuntime.ManagedRuntime<R, ER>
) =>
	function run<A, E extends ApplicationError>(
		effect: Effect.Effect<A, E, R>
	): Promise<A> {
		return runtime
			.runPromiseExit(effect)
			.then((exit) => completeHttpExit(exit));
	};

const runWebRuntimeEffect = makeWebEffectRunner(webRuntime);

export function runWebEffect<
	A,
	E extends ApplicationError,
	R extends WebServices,
>(effect: Effect.Effect<A, E, R>): Promise<A> {
	return runWebRuntimeEffect(effect);
}

export function runAuthenticatedEffect<
	A,
	E extends ApplicationError,
	R extends WebServices,
>(effect: Effect.Effect<A, E, CurrentUser | R>): Promise<A> {
	const headers = getRequestHeaders();
	const authenticated = Effect.gen(function* () {
		const auth = yield* BetterAuth;
		const session = yield* auth.getSession(headers);
		if (session === null) {
			return yield* Effect.fail(Unauthorized.make({}));
		}
		const userId = yield* Schema.decodeUnknownEffect(UserId)(
			session.user.id
		).pipe(Effect.mapError(() => Unauthorized.make({})));

		return yield* effect.pipe(
			Effect.provideService(CurrentUser, CurrentUser.of({ id: userId }))
		);
	});

	return runWebEffect(authenticated);
}
