import type { QueryError } from '@bookeeping-agent/db/errors';
import {
	getRequestHeaders,
	setResponseStatus,
} from '@tanstack/react-start/server';
import { Result, type Result as ResultType, TaggedError } from 'better-result';
import { auth } from '../lib/auth';

export class UnauthorizedError extends TaggedError('UnauthorizedError')<{
	message: string;
}>() {}

export class AgentUnavailableError extends TaggedError(
	'AgentUnavailableError'
)<{
	message: string;
}>() {}

export class UnexpectedAgentResponseError extends TaggedError(
	'UnexpectedAgentResponseError'
)<{
	message: string;
}>() {}

export type AppError =
	| AgentUnavailableError
	| QueryError
	| UnauthorizedError
	| UnexpectedAgentResponseError;

interface PublicError {
	_tag: string;
	message: string;
	resource?: string;
}

const errorStatus: Record<string, number> = {
	InvalidInputError: 400,
	UnauthorizedError: 401,
	CategoryOwnershipError: 403,
	NotFoundError: 404,
	DbError: 500,
	AgentUnavailableError: 502,
	UnexpectedAgentResponseError: 502,
};

function toPublicError(error: AppError): PublicError {
	switch (error._tag) {
		case 'CategoryOwnershipError':
			return {
				_tag: error._tag,
				message: 'Category does not belong to the authenticated user.',
			};
		case 'DbError':
			return {
				_tag: error._tag,
				message: 'Database operation failed.',
			};
		case 'InvalidInputError':
			return {
				_tag: error._tag,
				message: error.message,
			};
		case 'NotFoundError':
			return {
				_tag: error._tag,
				message: error.message,
				resource: error.resource,
			};
		case 'UnauthorizedError':
			return {
				_tag: error._tag,
				message: 'You need to sign in.',
			};
		case 'AgentUnavailableError':
			return {
				_tag: error._tag,
				message: 'Could not reach the bookkeeper agent.',
			};
		case 'UnexpectedAgentResponseError':
			return {
				_tag: error._tag,
				message: 'Bookkeeper agent returned an unexpected response shape.',
			};
		default:
			return {
				_tag: (error as { _tag: string })._tag,
				message: 'Something went wrong.',
			};
	}
}

export async function getSessionResult() {
	return await Result.tryPromise({
		try: () => auth.api.getSession({ headers: getRequestHeaders() }),
		catch: (cause) =>
			new UnauthorizedError({
				message:
					cause instanceof Error ? cause.message : 'You need to sign in.',
			}),
	}).then((result) =>
		result.andThen((session) =>
			session
				? Result.ok(session)
				: Result.err(new UnauthorizedError({ message: 'You need to sign in.' }))
		)
	);
}

export function serializeResult<T>(result: ResultType<T, AppError>) {
	if (result.isOk()) {
		return Result.serialize(result);
	}

	const publicError = toPublicError(result.error);
	const status = errorStatus[publicError._tag] ?? 500;
	setResponseStatus(status);

	if (status >= 500) {
		console.error('server fn error', result.error);
	}

	return Result.serialize(Result.err(publicError));
}
