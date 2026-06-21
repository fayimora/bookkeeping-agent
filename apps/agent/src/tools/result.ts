import type { QueryError } from '@bookeeping-agent/db/errors';
import { type Result as ResultType, TaggedError } from 'better-result';

export class ToolInputError extends TaggedError('ToolInputError')<{
	message: string;
}>() {}

export type ToolError = QueryError | ToolInputError;

function toolErrorMessage(error: { _tag?: string; message?: string }) {
	switch (error._tag) {
		case 'CategoryOwnershipError':
			return 'Category does not belong to the authenticated user.';
		case 'DbError':
			return 'Database operation failed.';
		case 'InvalidInputError':
			return error.message ?? 'Invalid input.';
		case 'NotFoundError':
			return error.message ?? 'Item not found.';
		case 'ToolInputError':
			return error.message ?? 'Invalid tool input.';
		default:
			return 'Tool failed.';
	}
}

export function throwToolError(error: ToolError): never {
	throw new Error(toolErrorMessage(error));
}

export function unwrapToolResult<T>(result: ResultType<T, ToolError>) {
	if (result.isOk()) {
		return result.value;
	}

	throwToolError(result.error);
}
