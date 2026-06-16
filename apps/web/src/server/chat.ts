import { env } from '@bookeeping-agent/env/server';
import { type AgentPromptImage, createFlueClient } from '@flue/sdk';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
	maxAttachments,
	maxImageDataLength,
	supportedImageTypes,
} from '../lib/chat-attachments';

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
		return result;
	}

	// flue returns result as unknown and that's pretty annoyingto work with
	const text = (result as { text?: unknown } | null)?.text;

	if (typeof text === 'string') {
		return text;
	}

	throw new Error('Bookkeeper agent returned an unexpected response shape.');
}

export const sendChatMessage = createServerFn({ method: 'POST' })
	.validator((data: unknown) => sendChatMessageInputSchema.parse(data))
	.handler(async ({ data }) => {
		const client = createBookkeeperClient();
		const images: AgentPromptImage[] | undefined = data.images?.length
			? data.images
			: undefined;
		const response = await client.agents.prompt('bookkeeper', 'default', {
			message: data.message,
			images,
		});

		return {
			message: getAgentText(response.result),
		};
	});
