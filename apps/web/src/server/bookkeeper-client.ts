import { WebServerConfig } from '@bookeeping-agent/env/web-server';
import {
	type AgentPromptImage,
	type AgentPromptOptions,
	createFlueClient,
} from '@flue/sdk';
import { Context, Effect, Layer, Option, Redacted, Schema } from 'effect';

export class BookkeeperClientError extends Schema.TaggedErrorClass<BookkeeperClientError>()(
	'BookkeeperClientError',
	{
		cause: Schema.Defect(),
		operation: Schema.String,
	}
) {}

export class AgentResponseError extends Schema.TaggedErrorClass<AgentResponseError>()(
	'AgentResponseError',
	{
		cause: Schema.Defect(),
	}
) {}

export const BookkeeperResponse = Schema.Struct({
	text: Schema.String,
});
export interface BookkeeperResponse
	extends Schema.Schema.Type<typeof BookkeeperResponse> {}

export interface BookkeeperPrompt {
	readonly images?: readonly AgentPromptImage[];
	readonly message: string;
}

export interface BookkeeperClientService {
	readonly prompt: (
		instanceId: string,
		input: BookkeeperPrompt
	) => Effect.Effect<
		BookkeeperResponse,
		AgentResponseError | BookkeeperClientError
	>;
}

export class BookkeeperClient extends Context.Service<
	BookkeeperClient,
	BookkeeperClientService
>()('@bookeeping-agent/web/BookkeeperClient') {}

export const BookkeeperClientLive = Layer.effect(
	BookkeeperClient,
	Effect.gen(function* () {
		const baseUrl = yield* WebServerConfig.flueBaseUrl;
		const token = yield* WebServerConfig.flueToken;
		const client = createFlueClient({
			baseUrl: baseUrl.toString(),
			token: Option.match(token, {
				onNone: () => undefined,
				onSome: Redacted.value,
			}),
		});

		const prompt = Effect.fn('BookkeeperClient.prompt')(function* (
			instanceId: string,
			input: BookkeeperPrompt
		) {
			const options: AgentPromptOptions = {
				images:
					input.images === undefined ? undefined : Array.from(input.images),
				message: input.message,
			};
			const response = yield* Effect.tryPromise({
				catch: (cause) =>
					BookkeeperClientError.make({
						cause,
						operation: 'BookkeeperClient.prompt',
					}),
				try: (signal) =>
					client.agents.prompt('bookkeeper', instanceId, {
						...options,
						signal,
					}),
			});

			return yield* Schema.decodeUnknownEffect(BookkeeperResponse)(
				response.result
			).pipe(Effect.mapError((cause) => AgentResponseError.make({ cause })));
		});

		return BookkeeperClient.of({ prompt });
	})
);
