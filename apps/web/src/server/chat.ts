import { env } from '@bookeeping-agent/env/server';
import { createFlueClient } from '@flue/sdk';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const sendChatMessageInputSchema = z.object({
	message: z.string().trim().min(1).max(4000),
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
		const response = await client.agents.prompt('bookkeeper', 'default', {
			message: data.message,
		});

		return {
			message: getAgentText(response.result),
		};
	});
