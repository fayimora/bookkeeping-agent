import { WebServerConfig } from '@bookeeping-agent/env/web-server';
import { currentTraceHeaders } from '@bookeeping-agent/telemetry/propagation';
import {
	type AgentPromptOptions,
	createFlueClient,
	type DeliveredAttachment,
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
	readonly images?: readonly DeliveredAttachment[];
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

const trailingSlashes = /\/+$/;

function getConversationUrl(baseUrl: URL, instanceId: string) {
	const url = new URL(baseUrl);
	const basePath = url.pathname.replace(trailingSlashes, '');
	url.pathname = `${basePath}/agents/bookkeeper/${encodeURIComponent(instanceId)}`;
	url.search = '';
	url.hash = '';
	return url.toString();
}

export const BookkeeperClientLive = Layer.effect(
	BookkeeperClient,
	Effect.gen(function* () {
		const baseUrl = yield* WebServerConfig.flueBaseUrl;
		const token = yield* WebServerConfig.flueToken;
		const bearerToken = Option.match(token, {
			onNone: () => undefined,
			onSome: Redacted.value,
		});

		const prompt = Effect.fn('BookkeeperClient.prompt')(function* (
			instanceId: string,
			input: BookkeeperPrompt
		) {
			const traceHeaders = yield* currentTraceHeaders.pipe(Effect.orDie);
			const client = createFlueClient({
				headers: traceHeaders,
				token: bearerToken,
				url: getConversationUrl(baseUrl, instanceId),
			});
			const options: AgentPromptOptions = {
				message: {
					attachments:
						input.images === undefined ? undefined : Array.from(input.images),
					body: input.message,
					kind: 'user',
				},
			};
			const response = yield* Effect.tryPromise({
				catch: (cause) =>
					BookkeeperClientError.make({
						cause,
						operation: 'BookkeeperClient.prompt',
					}),
				try: async (signal) => {
					const admission = await client.send({ ...options, signal });
					return client.read(admission, { signal });
				},
			});

			return yield* Schema.decodeUnknownEffect(BookkeeperResponse)(
				response
			).pipe(Effect.mapError((cause) => AgentResponseError.make({ cause })));
		});

		return BookkeeperClient.of({ prompt });
	})
);
