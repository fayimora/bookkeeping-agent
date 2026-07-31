import type {
	CategoriesRepo,
	ConversationsRepo,
	ExpensesRepo,
} from '@bookeeping-agent/db';
import {
	CategoryNotFound,
	CategoryNotOwned,
	ConflictingUpdate,
	ConversationNotFound,
	ConversationNotOwned,
	EmptyUpdate,
	ExpenseNotFound,
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

import { BetterAuth, CurrentUser, Unauthorized } from './auth';
import {
	AgentResponseError,
	type BookkeeperClient,
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

export function classifyApplicationError(error: unknown): HttpFailure {
	if (
		error instanceof ExpenseNotFound ||
		error instanceof CategoryNotFound ||
		error instanceof ConversationNotFound ||
		error instanceof ConversationNotOwned
	) {
		return { message: 'Resource not found.', status: 404 };
	}
	if (error instanceof Unauthorized) {
		return { message: 'Unauthorized.', status: 401 };
	}
	if (
		error instanceof CategoryNotOwned ||
		error instanceof EmptyUpdate ||
		error instanceof ConflictingUpdate
	) {
		return { message: 'Request conflicts with current state.', status: 409 };
	}
	if (
		error instanceof BookkeeperClientError ||
		error instanceof AgentResponseError
	) {
		return { message: 'Bookkeeper agent is unavailable.', status: 502 };
	}
	return internalServerError;
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
	function run<A, E>(effect: Effect.Effect<A, E, R>): Promise<A> {
		return runtime
			.runPromiseExit(effect)
			.then((exit) => completeHttpExit(exit));
	};

const runWebRuntimeEffect = makeWebEffectRunner(webRuntime);

export function runWebEffect<A, E, R extends WebServices>(
	effect: Effect.Effect<A, E, R>
): Promise<A> {
	return runWebRuntimeEffect(effect);
}

export function runAuthenticatedEffect<A, E, R extends WebServices>(
	effect: Effect.Effect<A, E, CurrentUser | R>
): Promise<A> {
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
