import { ConversationsRepo } from '@bookeeping-agent/db';
import type { SendChatMessageInput } from '@bookeeping-agent/domain';
import { Effect } from 'effect';
import sanitizeHtml from 'sanitize-html';
import { markdownToHtml } from 'satteri';

import { CurrentUser } from './auth';
import { BookkeeperClient } from './bookkeeper-client';

const defaultConversationTitle = 'New chat';
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
	const currentUser = yield* CurrentUser;
	const conversations = yield* ConversationsRepo;
	const bookkeeper = yield* BookkeeperClient;
	const conversation = yield* conversations.getById(
		currentUser.id,
		input.conversationId
	);
	const attachmentNames = input.images
		?.map((image) => image.name)
		.filter((name) => name !== undefined);

	yield* conversations.addMessage(currentUser.id, conversation.id, {
		attachmentNames:
			attachmentNames === undefined || attachmentNames.length === 0
				? null
				: attachmentNames,
		content: input.message,
		role: 'user',
	});

	if (conversation.title === defaultConversationTitle) {
		yield* conversations.rename(currentUser.id, conversation.id, {
			title: deriveConversationTitle(input.message),
		});
	}

	const images =
		input.images === undefined || input.images.length === 0
			? undefined
			: input.images.map(({ data, mimeType, type }) => ({
					data,
					mimeType,
					type,
				}));
	const response = yield* bookkeeper.prompt(
		`${currentUser.id}::${conversation.id}`,
		{
			images,
			message: input.message,
		}
	);
	const message = response.text;
	const messageHtml = renderMarkdownToSafeHtml(message);

	yield* conversations.addMessage(currentUser.id, conversation.id, {
		content: message,
		contentHtml: messageHtml,
		role: 'assistant',
	});

	return { message, messageHtml };
});
