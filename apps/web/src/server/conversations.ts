import { ConversationsRepo } from '@bookeeping-agent/db';
import { createServerFn } from '@tanstack/react-start';
import { Effect } from 'effect';

import { CurrentUser } from './auth';
import { runAuthenticatedEffect } from './http';
import { ConversationValidators } from './validators';

export const listConversations = createServerFn({ method: 'GET' }).handler(() =>
	runAuthenticatedEffect(
		Effect.gen(function* () {
			const currentUser = yield* CurrentUser;
			const conversations = yield* ConversationsRepo;
			const records = yield* conversations.list(currentUser.id);
			return Array.from(records);
		})
	)
);

export const getConversationById = createServerFn({ method: 'GET' })
	.validator(ConversationValidators.id)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const conversations = yield* ConversationsRepo;
				return yield* conversations.getById(currentUser.id, data.id);
			})
		)
	);

export const createConversation = createServerFn({ method: 'POST' })
	.validator(ConversationValidators.create)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const conversations = yield* ConversationsRepo;
				return yield* conversations.create(currentUser.id, data ?? {});
			})
		)
	);

export const renameConversation = createServerFn({ method: 'POST' })
	.validator(ConversationValidators.rename)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const conversations = yield* ConversationsRepo;
				return yield* conversations.rename(currentUser.id, data.id, data.input);
			})
		)
	);

export const deleteConversation = createServerFn({ method: 'POST' })
	.validator(ConversationValidators.id)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const conversations = yield* ConversationsRepo;

				// Flue currently exposes no session-delete API. Its composite keys are
				// unique and never reused, so retained state cannot collide with a new
				// conversation. Reclaim it when Flue adds deletion support.
				return yield* conversations.delete(currentUser.id, data.id);
			})
		)
	);

export const listMessages = createServerFn({ method: 'GET' })
	.validator(ConversationValidators.listMessages)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const conversations = yield* ConversationsRepo;
				const messages = yield* conversations.listMessages(
					currentUser.id,
					data.conversationId
				);
				return messages.map((message) => ({
					...message,
					attachmentNames:
						message.attachmentNames === null
							? null
							: Array.from(message.attachmentNames),
				}));
			})
		)
	);
