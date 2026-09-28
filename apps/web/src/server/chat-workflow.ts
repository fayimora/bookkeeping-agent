import { ConversationsRepo } from '@bookeeping-agent/db';
import {
	makeAgentInstanceId,
	type SendChatMessageInput,
} from '@bookeeping-agent/domain';
import { Effect } from 'effect';
import sanitizeHtml from 'sanitize-html';
import { markdownToHtml } from 'satteri';

import { CurrentUser } from './auth';
import { BookkeeperClient } from './bookkeeper-client';

const maxDerivedTitleLength = 48;

export function deriveConversationTitle(message: string) {
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

export function renderMarkdownToSafeHtml(markdown: string) {
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

export const sendChatMessageWorkflow = Effect.fn('Chat.sendMessage')(function* (
	input: SendChatMessageInput
) {
	yield* Effect.annotateCurrentSpan('chat.id', input.conversationId);

	const currentUser = yield* CurrentUser;
	const conversations = yield* ConversationsRepo;
	const bookkeeper = yield* BookkeeperClient;
	const attachmentNames = input.images
		?.map((image) => image.name)
		.filter((name) => name !== undefined);

	// Fails with ConversationNotOwned before the agent is ever prompted.
	yield* conversations.addMessage(
		currentUser.id,
		input.conversationId,
		{
			attachmentNames:
				attachmentNames === undefined || attachmentNames.length === 0
					? null
					: attachmentNames,
			content: input.message,
			role: 'user',
		},
		{ titleIfDefault: deriveConversationTitle(input.message) }
	);

	const images =
		input.images === undefined || input.images.length === 0
			? undefined
			: input.images.map(({ data, mimeType, type }) => ({
					data,
					mimeType,
					type,
				}));
	const response = yield* bookkeeper.prompt(
		makeAgentInstanceId(currentUser.id, input.conversationId),
		{
			images,
			message: input.message,
		}
	);
	const message = response.text;
	const messageHtml = renderMarkdownToSafeHtml(message);

	yield* conversations.addMessage(currentUser.id, input.conversationId, {
		content: message,
		contentHtml: messageHtml,
		role: 'assistant',
	});

	return { message, messageHtml };
});
