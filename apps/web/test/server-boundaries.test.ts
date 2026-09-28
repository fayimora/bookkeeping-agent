import { DbError } from '@bookeeping-agent/db';
import {
	CategoryId,
	CategoryNotFound,
	CategoryNotOwned,
	ConflictingUpdate,
	ConversationId,
	ConversationNotFound,
	ConversationNotOwned,
	EmptyUpdate,
	ExpenseId,
	ExpenseNotFound,
	UserId,
} from '@bookeeping-agent/domain';
import {
	getRequestHeaders,
	getResponseStatus,
	requestHandler,
} from '@tanstack/react-start/server';
import { Effect, Layer, ManagedRuntime, Schema } from 'effect';
import { describe, expect, it } from 'vitest';

import { BetterAuthError, Unauthorized } from '../src/server/auth';
import {
	AgentResponseError,
	BookkeeperClientError,
	BookkeeperResponse,
} from '../src/server/bookkeeper-client';
import {
	classifyApplicationError,
	makeWebEffectRunner,
} from '../src/server/http';
import { ExpenseValidators } from '../src/server/validators';

const makeDeferred = () => {
	let complete: () => void = () => undefined;
	const promise = new Promise<void>((resolve) => {
		complete = resolve;
	});
	return { complete, promise };
};

const uuid = '11111111-1111-4111-8111-111111111111';
const userId = Schema.decodeUnknownSync(UserId)('user-1');
const conversationId = Schema.decodeUnknownSync(ConversationId)(uuid);
const cause = new Error('boom');
const schemaError = Effect.runSync(
	Effect.flip(Schema.decodeUnknownEffect(ExpenseId)('not-a-uuid'))
);

const expectedFailures = [
	[
		ExpenseNotFound.make({
			expenseId: Schema.decodeUnknownSync(ExpenseId)(uuid),
		}),
		404,
		'Resource not found.',
	],
	[CategoryNotFound.make({ identifier: 'food' }), 404, 'Resource not found.'],
	[ConversationNotFound.make({ conversationId }), 404, 'Resource not found.'],
	[
		ConversationNotOwned.make({ conversationId, userId }),
		404,
		'Resource not found.',
	],
	[Unauthorized.make({}), 401, 'Unauthorized.'],
	[
		CategoryNotOwned.make({
			categoryId: Schema.decodeUnknownSync(CategoryId)(uuid),
			userId,
		}),
		409,
		'Request conflicts with current state.',
	],
	[
		EmptyUpdate.make({ entity: 'expense' }),
		409,
		'Request conflicts with current state.',
	],
	[
		ConflictingUpdate.make({ field: 'category' }),
		409,
		'Request conflicts with current state.',
	],
	[
		BookkeeperClientError.make({ cause, operation: 'prompt' }),
		502,
		'Bookkeeper agent is unavailable.',
	],
	[AgentResponseError.make({ cause }), 502, 'Bookkeeper agent is unavailable.'],
	[DbError.make({ cause, operation: 'query' }), 500, 'Internal server error.'],
	[
		BetterAuthError.make({ cause, operation: 'getSession' }),
		500,
		'Internal server error.',
	],
	[schemaError, 500, 'Internal server error.'],
] as const;

const validBookkeeperResponse = {
	text: 'Done.',
};

describe('web server boundaries', () => {
	it('marks Standard Schema validation failures as sanitized HTTP 400s', async () => {
		const handle = requestHandler(async () => {
			try {
				await ExpenseValidators.id({ id: 'not-a-uuid' });
				return new Response(null, { status: 204 });
			} catch (error) {
				return new Response(
					error instanceof Error
						? error.message
						: 'Unexpected validation error.',
					{ status: getResponseStatus() }
				);
			}
		});

		const response = await handle(
			new Request('http://localhost/validation'),
			{}
		);
		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Invalid request.');
	});

	it('isolates headers and statuses across a lazily initialized shared runtime', async () => {
		const requestCount = 12;
		const allHeadersCaptured = makeDeferred();
		const initializationStarted = makeDeferred();
		const releaseInitialization = makeDeferred();
		let capturedHeaders = 0;
		let layerBuilds = 0;
		const runtime = ManagedRuntime.make(
			Layer.effectDiscard(
				Effect.promise(async () => {
					layerBuilds += 1;
					initializationStarted.complete();
					await releaseInitialization.promise;
				})
			)
		);
		const run = makeWebEffectRunner(runtime);
		const handle = requestHandler(async () => {
			const requestId = getRequestHeaders().get('x-request-id');
			capturedHeaders += 1;
			if (capturedHeaders === requestCount) {
				allHeadersCaptured.complete();
			}
			await allHeadersCaptured.promise;

			const requestIndex = Number.parseInt(requestId ?? '', 10);
			const applicationError =
				requestIndex % 2 === 0
					? Unauthorized.make({})
					: EmptyUpdate.make({ entity: 'expense' });
			try {
				await run(Effect.fail(applicationError));
				return new Response(null, { status: 204 });
			} catch (error) {
				return Response.json(
					{
						message: error instanceof Error ? error.message : 'Unknown error.',
						requestId,
					},
					{ status: getResponseStatus() }
				);
			}
		});

		try {
			const responsesPromise = Promise.all(
				Array.from({ length: requestCount }, (_, index) =>
					handle(
						new Request(`http://localhost/concurrent/${index}`, {
							headers: { 'x-request-id': String(index) },
						}),
						{}
					)
				)
			);
			await initializationStarted.promise;
			expect(layerBuilds).toBe(1);
			releaseInitialization.complete();

			const responses = await responsesPromise;
			await Promise.all(
				responses.map(async (response, index) => {
					const body = await response.json();
					expect(body).toEqual({
						message:
							index % 2 === 0
								? 'Unauthorized.'
								: 'Request conflicts with current state.',
						requestId: String(index),
					});
					expect(response.status).toBe(index % 2 === 0 ? 401 : 409);
				})
			);
		} finally {
			releaseInitialization.complete();
			await runtime.dispose();
		}
	});

	it.each(expectedFailures)(
		'classifies %o without exposing details',
		(error, status, message) => {
			expect(classifyApplicationError(error)).toEqual({ message, status });
		}
	);

	it.each([new Error('untyped'), { _tag: 'SomethingElse' }, 'string', null])(
		'falls back to 500 for unknown value %o',
		(value) => {
			expect(classifyApplicationError(value)).toEqual({
				message: 'Internal server error.',
				status: 500,
			});
		}
	);

	it('decodes the current agent response contract', async () => {
		const decoded = await Effect.runPromise(
			Schema.decodeUnknownEffect(BookkeeperResponse)(validBookkeeperResponse)
		);
		expect(decoded.text).toBe('Done.');
	});

	it('rejects malformed agent responses', async () => {
		const exit = await Effect.runPromiseExit(
			Schema.decodeUnknownEffect(BookkeeperResponse)({ text: 42 })
		);
		expect(exit._tag).toBe('Failure');
	});
});
