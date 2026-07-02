import {
	addMessage,
	getConversationById,
	renameConversation,
} from '@bookeeping-agent/db/queries/conversations';
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
	name: z.string().trim().min(1).max(255).optional(),
});

const sendChatMessageInputSchema = z.object({
	conversationId: z.uuid(),
	message: z.string().trim().min(1).max(4000),
	images: z.array(chatImageSchema).max(maxAttachments).optional(),
});

const defaultConversationTitle = 'New chat';
const maxDerivedTitleLength = 48;

function deriveConversationTitle(message: string) {
	const normalized = message.replace(/\s+/g, ' ').trim();

	if (normalized.length <= maxDerivedTitleLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxDerivedTitleLength).trimEnd()}…`;
}

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
		const userId = session.user.id;

		const conversation = await getConversationById(userId, data.conversationId);

		if (!conversation) {
			throw new Error('Conversation not found.');
		}

		const attachmentNames = data.images
			?.map((image) => image.name)
			.filter((name): name is string => Boolean(name));

		await addMessage(userId, conversation.id, {
			role: 'user',
			content: data.message,
			attachmentNames: attachmentNames?.length ? attachmentNames : null,
		});

		if (conversation.title === defaultConversationTitle) {
			await renameConversation(userId, conversation.id, {
				title: deriveConversationTitle(data.message),
			});
		}

		const client = createBookkeeperClient();
		const images: AgentPromptImage[] | undefined = data.images?.length
			? data.images.map(({ data: imageData, mimeType, type }) => ({
					data: imageData,
					mimeType,
					type,
				}))
			: undefined;
		const response = await client.agents.prompt(
			'bookkeeper',
			`${userId}::${conversation.id}`,
			{
				message: data.message,
				images,
			}
		);

		const message = getAgentText(response.result);
		const messageHtml = renderMarkdownToSafeHtml(message);

		await addMessage(userId, conversation.id, {
			role: 'assistant',
			content: message,
			contentHtml: messageHtml,
		});

		return {
			message,
			messageHtml,
		};
	});
