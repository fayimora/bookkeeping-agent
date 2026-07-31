import { EmptyUpdate } from '@bookeeping-agent/domain';
import {
	getRequestHeaders,
	getResponseStatus,
	requestHandler,
} from '@tanstack/react-start/server';
import { Effect, Layer, ManagedRuntime, Schema } from 'effect';
import { describe, expect, it } from 'vitest';

import { Unauthorized } from '../src/server/auth';
import { BookkeeperResponse } from '../src/server/bookkeeper-client';
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

	it('classifies unauthorized failures without exposing details', () => {
		expect(classifyApplicationError(Unauthorized.make({}))).toEqual({
			message: 'Unauthorized.',
			status: 401,
		});
	});

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
