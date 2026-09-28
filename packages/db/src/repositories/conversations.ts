import {
	type AddMessageInput,
	type Conversation,
	type ConversationId,
	ConversationNotFound,
	Conversation as ConversationSchema,
	type CreateConversationInput,
	type Message,
	Message as MessageSchema,
	type RenameConversationInput,
	type UserId,
} from '@bookeeping-agent/domain';
import { defaultConversationTitle } from '@bookeeping-agent/domain/conversation';
import { and, asc, desc, eq, getColumns, sql } from 'drizzle-orm';
import { Context, Effect, Layer, Schema } from 'effect';

import { Database } from '#db/database';
import {
	type DbError,
	dbError,
	missingRow,
	transactionError,
} from '#db/errors';
import { conversations, messages } from '#db/schema';

export interface AddMessageOptions {
	/** Replace the title in the same statement, only while it is still the default. */
	readonly titleIfDefault?: string;
}

export interface ConversationsRepoService {
	readonly addMessage: (
		userId: UserId,
		conversationId: ConversationId,
		input: AddMessageInput,
		options?: AddMessageOptions
	) => Effect.Effect<Message, ConversationNotFound | DbError>;
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
	) => Effect.Effect<readonly Message[], ConversationNotFound | DbError>;
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
					missingRow('ConversationsRepo.create.insert')
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
			// Scope through the owning conversation so the common case is one query.
			const rows = yield* db
				.select(getColumns(messages))
				.from(messages)
				.innerJoin(conversations, eq(conversations.id, messages.conversationId))
				.where(
					and(
						eq(conversations.id, conversationId),
						eq(conversations.userId, userId)
					)
				)
				.orderBy(asc(messages.createdAt))
				.pipe(dbError('ConversationsRepo.listMessages.query'));

			// No rows means either an empty owned conversation or no access.
			if (rows.length === 0) {
				yield* getById(userId, conversationId);
			}

			return yield* decodeMessages(
				'ConversationsRepo.listMessages.decode',
				rows
			);
		});

		const addMessage = Effect.fn('ConversationsRepo.addMessage')(function* (
			userId: UserId,
			conversationId: ConversationId,
			input: AddMessageInput,
			options: AddMessageOptions = {}
		) {
			return yield* db
				.transaction((tx) =>
					Effect.gen(function* () {
						const now = new Date();
						// The owner-scoped touch doubles as the ownership check and row lock.
						const touched = yield* tx
							.update(conversations)
							.set({
								lastMessageAt: now,
								updatedAt: now,
								...(options.titleIfDefault === undefined
									? {}
									: {
											title: sql`CASE WHEN ${conversations.title} = ${defaultConversationTitle} THEN ${options.titleIfDefault} ELSE ${conversations.title} END`,
										}),
							})
							.where(
								and(
									eq(conversations.id, conversationId),
									eq(conversations.userId, userId)
								)
							)
							.returning({ id: conversations.id })
							.pipe(dbError('ConversationsRepo.addMessage.touch'));
						if (touched.length === 0) {
							return yield* Effect.fail(
								ConversationNotFound.make({ conversationId })
							);
						}

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
								missingRow('ConversationsRepo.addMessage.insert')
							);
						}

						return yield* decodeMessage(
							'ConversationsRepo.addMessage.decode',
							row
						);
					})
				)
				.pipe(transactionError('ConversationsRepo.addMessage.transaction'));
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
