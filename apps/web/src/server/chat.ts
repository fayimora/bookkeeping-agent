import { parseResult } from '@bookeeping-agent/db/errors';
import { env } from '@bookeeping-agent/env/server';
import { type AgentPromptImage, createFlueClient } from '@flue/sdk';
import { createServerFn } from '@tanstack/react-start';
import { Result } from 'better-result';
import { z } from 'zod';

import {
	maxAttachments,
	maxImageDataLength,
	supportedImageTypes,
} from '../lib/chat-attachments';
import {
	AgentUnavailableError,
	getSessionResult,
	serializeResult,
	UnexpectedAgentResponseError,
} from './result';

const chatImageSchema = z.object({
	type: z.literal('image'),
	data: z.string().min(1).max(maxImageDataLength),
	mimeType: z.enum(supportedImageTypes),
});

const sendChatMessageInputSchema = z.object({
	message: z.string().trim().min(1).max(4000),
	images: z.array(chatImageSchema).max(maxAttachments).optional(),
});

function createBookkeeperClient() {
	return createFlueClient({
		baseUrl: env.FLUE_BASE_URL,
		token: env.FLUE_TOKEN,
	});
}

function getAgentText(result: unknown) {
	if (typeof result === 'string') {
		return Result.ok(result);
	}

	// flue returns result as unknown and that's pretty annoying to work with
	const text = (result as { text?: unknown } | null)?.text;

	if (typeof text === 'string') {
		return Result.ok(text);
	}

	return Result.err(
		new UnexpectedAgentResponseError({
			message: 'Bookkeeper agent returned an unexpected response shape.',
		})
	);
}

export const sendChatMessage = createServerFn({ method: 'POST' })
	.validator((data: unknown) => data)
	.handler(async ({ data }) =>
		serializeResult(
			await Result.gen(async function* () {
				const input = yield* parseResult(() =>
					sendChatMessageInputSchema.parse(data)
				);
				const session = yield* Result.await(getSessionResult());

				const client = createBookkeeperClient();
				const images: AgentPromptImage[] | undefined = input.images?.length
					? input.images
					: undefined;

				const response = yield* Result.await(
					Result.tryPromise({
						try: () =>
							client.agents.prompt('bookkeeper', session.user.id, {
								message: input.message,
								images,
							}),
						catch: (cause) =>
							new AgentUnavailableError({
								message:
									cause instanceof Error
										? cause.message
										: 'Could not reach the bookkeeper agent.',
							}),
					})
				);

				const message = yield* getAgentText(response.result);

				return Result.ok({ message });
			})
		)
	);
