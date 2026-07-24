import {
	ConversationId,
	AddMessageInput as DomainAddMessageInput,
	CreateConversationInput as DomainCreateConversationInput,
	RenameConversationInput as DomainRenameConversationInput,
	UserId,
} from '@bookeeping-agent/domain';
import { Effect, Schema } from 'effect';
import { z } from 'zod';

import { ConversationsRepo } from '#db/repositories';
import { repositoryRuntime } from '#db/runtime';

const titleSchema = z.string().trim().min(1).max(200);
export const createConversationSchema = z.object({
	title: titleSchema.optional(),
});
export const renameConversationSchema = z.object({ title: titleSchema });
export const addMessageSchema = z.object({
	attachmentNames: z.array(z.string().min(1)).nullable().optional(),
	content: z.string().min(1),
	contentHtml: z.string().nullable().optional(),
	role: z.enum(['user', 'assistant']),
});

export type CreateConversationInput = z.input<typeof createConversationSchema>;
export type RenameConversationInput = z.input<typeof renameConversationSchema>;
export type AddMessageInput = z.input<typeof addMessageSchema>;

export function listConversations(userId: string) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const repo = yield* ConversationsRepo;
			const conversations = yield* repo.list(parsedUserId);
			return Array.from(conversations);
		})
	);
}

export function getConversationById(userId: string, id: string) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const conversationId =
				yield* Schema.decodeUnknownEffect(ConversationId)(id);
			const repo = yield* ConversationsRepo;
			return yield* repo
				.getById(parsedUserId, conversationId)
				.pipe(
					Effect.catchTag('ConversationNotFound', () => Effect.succeed(null))
				);
		})
	);
}

export function createConversation(
	userId: string,
	input: CreateConversationInput = {}
) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const values = yield* Schema.decodeUnknownEffect(
				DomainCreateConversationInput
			)(input);
			const repo = yield* ConversationsRepo;
			return yield* repo.create(parsedUserId, values);
		})
	);
}

export function renameConversation(
	userId: string,
	id: string,
	input: RenameConversationInput
) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const conversationId =
				yield* Schema.decodeUnknownEffect(ConversationId)(id);
			const values = yield* Schema.decodeUnknownEffect(
				DomainRenameConversationInput
			)(input);
			const repo = yield* ConversationsRepo;
			return yield* repo
				.rename(parsedUserId, conversationId, values)
				.pipe(
					Effect.catchTag('ConversationNotFound', () => Effect.succeed(null))
				);
		})
	);
}

export function deleteConversation(userId: string, id: string) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const conversationId =
				yield* Schema.decodeUnknownEffect(ConversationId)(id);
			const repo = yield* ConversationsRepo;
			return yield* repo
				.delete(parsedUserId, conversationId)
				.pipe(
					Effect.catchTag('ConversationNotFound', () => Effect.succeed(null))
				);
		})
	);
}

export function listMessages(userId: string, conversationId: string) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const parsedConversationId =
				yield* Schema.decodeUnknownEffect(ConversationId)(conversationId);
			const repo = yield* ConversationsRepo;
			const messages = yield* repo.listMessages(
				parsedUserId,
				parsedConversationId
			);
			return messages.map((message) => ({
				...message,
				attachmentNames:
					message.attachmentNames === null
						? null
						: Array.from(message.attachmentNames),
			}));
		})
	);
}

export function addMessage(
	userId: string,
	conversationId: string,
	input: AddMessageInput
) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const parsedConversationId =
				yield* Schema.decodeUnknownEffect(ConversationId)(conversationId);
			const values = yield* Schema.decodeUnknownEffect(DomainAddMessageInput)(
				input
			);
			const repo = yield* ConversationsRepo;
			return yield* repo.addMessage(parsedUserId, parsedConversationId, values);
		})
	);
}
