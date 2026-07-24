import {
	type AddMessageInput,
	type Conversation,
	type ConversationId,
	ConversationNotFound,
	ConversationNotOwned,
	Conversation as ConversationSchema,
	type CreateConversationInput,
	type Message,
	Message as MessageSchema,
	type RenameConversationInput,
	type UserId,
} from '@bookeeping-agent/domain';
import { and, asc, desc, eq } from 'drizzle-orm';
import { Context, Effect, Layer, Schema } from 'effect';

import { Database } from '#db/database';
import { DbError, dbError } from '#db/errors';
import { conversations, messages } from '#db/schema';

export interface ConversationsRepoService {
	readonly addMessage: (
		userId: UserId,
		conversationId: ConversationId,
		input: AddMessageInput
	) => Effect.Effect<Message, ConversationNotOwned | DbError>;
	readonly create: (
		userId: UserId,
		input: CreateConversationInput
	) => Effect.Effect<Conversation, DbError>;
	readonly delete: (
		userId: UserId,
		conversationId: ConversationId
	) => Effect.Effect<Conversation, ConversationNotFound | DbError>;
	readonly getById: (
		userId: UserId,
		conversationId: ConversationId
	) => Effect.Effect<Conversation, ConversationNotFound | DbError>;
	readonly list: (
		userId: UserId
	) => Effect.Effect<readonly Conversation[], DbError>;
	readonly listMessages: (
		userId: UserId,
		conversationId: ConversationId
	) => Effect.Effect<readonly Message[], ConversationNotOwned | DbError>;
	readonly rename: (
		userId: UserId,
		conversationId: ConversationId,
		input: RenameConversationInput
	) => Effect.Effect<Conversation, ConversationNotFound | DbError>;
}

export class ConversationsRepo extends Context.Service<
	ConversationsRepo,
	ConversationsRepoService
>()('@bookeeping-agent/db/ConversationsRepo') {}

const decodeConversations = (operation: string, rows: unknown) =>
	Schema.decodeUnknownEffect(Schema.Array(ConversationSchema))(rows).pipe(
		dbError(operation)
	);
const decodeConversation = (operation: string, row: unknown) =>
	Schema.decodeUnknownEffect(ConversationSchema)(row).pipe(dbError(operation));
const decodeMessages = (operation: string, rows: unknown) =>
	Schema.decodeUnknownEffect(Schema.Array(MessageSchema))(rows).pipe(
		dbError(operation)
	);
const decodeMessage = (operation: string, row: unknown) =>
	Schema.decodeUnknownEffect(MessageSchema)(row).pipe(dbError(operation));

const missingMutationRow = (operation: string) =>
	DbError.make({
		cause: new Error('Database mutation returned no row.'),
		operation,
	});

export const ConversationsRepoLive = Layer.effect(
	ConversationsRepo,
	Effect.gen(function* () {
		const db = yield* Database;

		const list = Effect.fn('ConversationsRepo.list')(function* (
			userId: UserId
		) {
			const rows = yield* db
				.select()
				.from(conversations)
				.where(eq(conversations.userId, userId))
				.orderBy(
					desc(conversations.lastMessageAt),
					desc(conversations.createdAt)
				)
				.pipe(dbError('ConversationsRepo.list.query'));

			return yield* decodeConversations('ConversationsRepo.list.decode', rows);
		});

		const getById = Effect.fn('ConversationsRepo.getById')(function* (
			userId: UserId,
			conversationId: ConversationId
		) {
			const rows = yield* db
				.select()
				.from(conversations)
				.where(
					and(
						eq(conversations.id, conversationId),
						eq(conversations.userId, userId)
					)
				)
				.limit(1)
				.pipe(dbError('ConversationsRepo.getById.query'));
			const [row] = rows;
			if (row === undefined) {
				return yield* Effect.fail(
					ConversationNotFound.make({ conversationId })
				);
			}

			return yield* decodeConversation('ConversationsRepo.getById.decode', row);
		});

		const create = Effect.fn('ConversationsRepo.create')(function* (
			userId: UserId,
			input: CreateConversationInput
		) {
			const rows = yield* db
				.insert(conversations)
				.values({ ...input, userId })
				.returning()
				.pipe(dbError('ConversationsRepo.create.insert'));
			const [row] = rows;
			if (row === undefined) {
				return yield* Effect.fail(
					missingMutationRow('ConversationsRepo.create.insert')
				);
			}

			return yield* decodeConversation('ConversationsRepo.create.decode', row);
		});

		const rename = Effect.fn('ConversationsRepo.rename')(function* (
			userId: UserId,
			conversationId: ConversationId,
			input: RenameConversationInput
		) {
			const rows = yield* db
				.update(conversations)
				.set({ ...input, updatedAt: new Date() })
				.where(
					and(
						eq(conversations.id, conversationId),
						eq(conversations.userId, userId)
					)
				)
				.returning()
				.pipe(dbError('ConversationsRepo.rename.query'));
			const [row] = rows;
			if (row === undefined) {
				return yield* Effect.fail(
					ConversationNotFound.make({ conversationId })
				);
			}

			return yield* decodeConversation('ConversationsRepo.rename.decode', row);
		});

		const deleteConversation = Effect.fn('ConversationsRepo.delete')(function* (
			userId: UserId,
			conversationId: ConversationId
		) {
			const rows = yield* db
				.delete(conversations)
				.where(
					and(
						eq(conversations.id, conversationId),
						eq(conversations.userId, userId)
					)
				)
				.returning()
				.pipe(dbError('ConversationsRepo.delete.query'));
			const [row] = rows;
			if (row === undefined) {
				return yield* Effect.fail(
					ConversationNotFound.make({ conversationId })
				);
			}

			return yield* decodeConversation('ConversationsRepo.delete.decode', row);
		});

		const listMessages = Effect.fn('ConversationsRepo.listMessages')(function* (
			userId: UserId,
			conversationId: ConversationId
		) {
			const ownerRows = yield* db
				.select({ id: conversations.id })
				.from(conversations)
				.where(
					and(
						eq(conversations.id, conversationId),
						eq(conversations.userId, userId)
					)
				)
				.limit(1)
				.pipe(dbError('ConversationsRepo.listMessages.owner'));
			if (ownerRows.length === 0) {
				return yield* Effect.fail(
					ConversationNotOwned.make({ conversationId, userId })
				);
			}

			const rows = yield* db
				.select()
				.from(messages)
				.where(eq(messages.conversationId, conversationId))
				.orderBy(asc(messages.createdAt))
				.pipe(dbError('ConversationsRepo.listMessages.query'));

			return yield* decodeMessages(
				'ConversationsRepo.listMessages.decode',
				rows
			);
		});

		const addMessage = Effect.fn('ConversationsRepo.addMessage')(function* (
			userId: UserId,
			conversationId: ConversationId,
			input: AddMessageInput
		) {
			return yield* db
				.transaction((tx) =>
					Effect.gen(function* () {
						const ownerRows = yield* tx
							.select({ id: conversations.id })
							.from(conversations)
							.where(
								and(
									eq(conversations.id, conversationId),
									eq(conversations.userId, userId)
								)
							)
							.limit(1)
							.for('key share')
							.pipe(dbError('ConversationsRepo.addMessage.owner'));
						if (ownerRows.length === 0) {
							return yield* Effect.fail(
								ConversationNotOwned.make({ conversationId, userId })
							);
						}

						const now = new Date();
						const rows = yield* tx
							.insert(messages)
							.values({
								attachmentNames:
									input.attachmentNames === undefined ||
									input.attachmentNames === null
										? null
										: Array.from(input.attachmentNames),
								content: input.content,
								contentHtml: input.contentHtml ?? null,
								conversationId,
								createdAt: now,
								role: input.role,
								userId,
							})
							.returning()
							.pipe(dbError('ConversationsRepo.addMessage.insert'));
						const [row] = rows;
						if (row === undefined) {
							return yield* Effect.fail(
								missingMutationRow('ConversationsRepo.addMessage.insert')
							);
						}

						yield* tx
							.update(conversations)
							.set({ lastMessageAt: now, updatedAt: now })
							.where(eq(conversations.id, conversationId))
							.pipe(dbError('ConversationsRepo.addMessage.touch'));

						return yield* decodeMessage(
							'ConversationsRepo.addMessage.decode',
							row
						);
					})
				)
				.pipe(
					Effect.catchTag('SqlError', (cause) =>
						Effect.fail(
							DbError.make({
								cause,
								operation: 'ConversationsRepo.addMessage.transaction',
							})
						)
					)
				);
		});

		return ConversationsRepo.of({
			addMessage,
			create,
			delete: deleteConversation,
			getById,
			list,
			listMessages,
			rename,
		});
	})
);
