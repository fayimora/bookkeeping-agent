import { Result, type Result as ResultType, TaggedError } from 'better-result';
import { z } from 'zod';

export class InvalidInputError extends TaggedError('InvalidInputError')<{
	issues: string[];
	message: string;
}>() {}

export class NotFoundError extends TaggedError('NotFoundError')<{
	message: string;
	resource: 'category' | 'expense';
}>() {}

export class CategoryOwnershipError extends TaggedError(
	'CategoryOwnershipError'
)<{
	message: string;
}>() {}

export class DbError extends TaggedError('DbError')<{
	message: string;
}>() {}

export type QueryError =
	| CategoryOwnershipError
	| DbError
	| InvalidInputError
	| NotFoundError;

export function parseResult<T>(
	parse: () => T
): ResultType<T, InvalidInputError> {
	try {
		return Result.ok(parse());
	} catch (cause) {
		if (cause instanceof z.ZodError) {
			return Result.err(
				new InvalidInputError({
					issues: cause.issues.map((issue) => issue.message),
					message: 'Invalid input.',
				})
			);
		}

		return Result.err(
			new InvalidInputError({
				issues: [],
				message: cause instanceof Error ? cause.message : 'Invalid input.',
			})
		);
	}
}

export async function dbResult<T>(
	operation: () => Promise<T>
): Promise<ResultType<T, DbError>> {
	return await Result.tryPromise({
		try: operation,
		catch: (cause) =>
			new DbError({
				message:
					cause instanceof Error ? cause.message : 'Database operation failed.',
			}),
	});
}
