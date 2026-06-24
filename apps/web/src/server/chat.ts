import { env } from '@bookeeping-agent/env/server';
import { type AgentPromptImage, createFlueClient } from '@flue/sdk';
import { createServerFn } from '@tanstack/react-start';
import sanitizeHtml from 'sanitize-html';
import { markdownToHtml } from 'satteri';
import { z } from 'zod';

import { ensureSession } from '../lib/auth-functions';
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

const codeLanguageClassPattern = /^language-[\w-]+$/;
const centerAlignPattern = /^center$/;
const leftAlignPattern = /^left$/;
const rightAlignPattern = /^right$/;

const allowedMarkdownTags = [
	'a',
	'blockquote',
	'br',
	'code',
	'del',
	'em',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'hr',
	'li',
	'ol',
	'p',
	'pre',
	's',
	'strong',
	'table',
	'tbody',
	'td',
	'th',
	'thead',
	'tr',
	'ul',
];

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

function renderMarkdownToSafeHtml(markdown: string) {
	const { html } = markdownToHtml(markdown, {
		features: {
			frontmatter: false,
			gfm: true,
			math: false,
		},
	});

	return sanitizeHtml(html, {
		allowedAttributes: {
			a: ['href', 'title'],
			code: ['class'],
			td: ['style'],
			th: ['style'],
		},
		allowedClasses: {
			code: [codeLanguageClassPattern],
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		allowedStyles: {
			'*': {
				'text-align': [centerAlignPattern, leftAlignPattern, rightAlignPattern],
			},
		},
		allowedTags: allowedMarkdownTags,
		disallowedTagsMode: 'discard',
		enforceHtmlBoundary: true,
	});
}

export const sendChatMessage = createServerFn({ method: 'POST' })
	.validator((data: unknown) => sendChatMessageInputSchema.parse(data))
	.handler(async ({ data }) => {
		const session = await ensureSession();

		const client = createBookkeeperClient();
		const images: AgentPromptImage[] | undefined = data.images?.length
			? data.images
			: undefined;
		const response = await client.agents.prompt('bookkeeper', session.user.id, {
			message: data.message,
			images,
		});

		const message = getAgentText(response.result);

		return {
			message,
			messageHtml: renderMarkdownToSafeHtml(message),
		};
	});
