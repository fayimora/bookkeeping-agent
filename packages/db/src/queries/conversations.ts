import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '..';
import { conversations, messages } from '../schema';

const conversationIdSchema = z.uuid();
const userIdSchema = z.string().min(1);

const titleSchema = z.string().trim().min(1).max(200);

export const createConversationSchema = z.object({
	title: titleSchema.optional(),
});

export const renameConversationSchema = z.object({
	title: titleSchema,
});

export const addMessageSchema = z.object({
	attachmentNames: z.array(z.string().min(1)).nullable().optional(),
	content: z.string().min(1),
	contentHtml: z.string().nullable().optional(),
	role: z.enum(['user', 'assistant']),
});

export type CreateConversationInput = z.input<typeof createConversationSchema>;
export type RenameConversationInput = z.input<typeof renameConversationSchema>;
export type AddMessageInput = z.input<typeof addMessageSchema>;

async function ensureConversationBelongsToUser(
	userId: string,
	conversationId: string
) {
	const [conversation] = await db
		.select({ id: conversations.id })
		.from(conversations)
		.where(
			and(
				eq(conversations.id, conversationId),
				eq(conversations.userId, userId)
			)
		)
		.limit(1);

	if (!conversation) {
		throw new Error('Conversation does not belong to the authenticated user.');
	}
}

export async function listConversations(userId: string) {
	const parsedUserId = userIdSchema.parse(userId);

	return await db
		.select()
		.from(conversations)
		.where(eq(conversations.userId, parsedUserId))
		.orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));
}

export async function getConversationById(userId: string, id: string) {
	const parsedUserId = userIdSchema.parse(userId);
	const conversationId = conversationIdSchema.parse(id);
	const [conversation] = await db
		.select()
		.from(conversations)
		.where(
			and(
				eq(conversations.id, conversationId),
				eq(conversations.userId, parsedUserId)
			)
		)
		.limit(1);

	return conversation ?? null;
}

export async function createConversation(
	userId: string,
	input: CreateConversationInput = {}
) {
	const parsedUserId = userIdSchema.parse(userId);
	const values = createConversationSchema.parse(input);

	const [conversation] = await db
		.insert(conversations)
		.values({
			userId: parsedUserId,
			...(values.title ? { title: values.title } : {}),
		})
		.returning();

	return conversation;
}

export async function renameConversation(
	userId: string,
	id: string,
	input: RenameConversationInput
) {
	const parsedUserId = userIdSchema.parse(userId);
	const conversationId = conversationIdSchema.parse(id);
	const { title } = renameConversationSchema.parse(input);

	const [conversation] = await db
		.update(conversations)
		.set({ title, updatedAt: new Date() })
		.where(
			and(
				eq(conversations.id, conversationId),
				eq(conversations.userId, parsedUserId)
			)
		)
		.returning();

	return conversation ?? null;
}

export async function deleteConversation(userId: string, id: string) {
	const parsedUserId = userIdSchema.parse(userId);
	const conversationId = conversationIdSchema.parse(id);

	const [conversation] = await db
		.delete(conversations)
		.where(
			and(
				eq(conversations.id, conversationId),
				eq(conversations.userId, parsedUserId)
			)
		)
		.returning();

	return conversation ?? null;
}

export async function listMessages(userId: string, conversationId: string) {
	const parsedUserId = userIdSchema.parse(userId);
	const parsedConversationId = conversationIdSchema.parse(conversationId);

	await ensureConversationBelongsToUser(parsedUserId, parsedConversationId);

	return await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, parsedConversationId))
		.orderBy(asc(messages.createdAt));
}

export async function addMessage(
	userId: string,
	conversationId: string,
	input: AddMessageInput
) {
	const parsedUserId = userIdSchema.parse(userId);
	const parsedConversationId = conversationIdSchema.parse(conversationId);
	const values = addMessageSchema.parse(input);

	return await db.transaction(async (tx) => {
		const [conversation] = await tx
			.select({ id: conversations.id })
			.from(conversations)
			.where(
				and(
					eq(conversations.id, parsedConversationId),
					eq(conversations.userId, parsedUserId)
				)
			)
			.limit(1);

		if (!conversation) {
			throw new Error(
				'Conversation does not belong to the authenticated user.'
			);
		}

		const now = new Date();

		const [message] = await tx
			.insert(messages)
			.values({
				attachmentNames: values.attachmentNames ?? null,
				content: values.content,
				contentHtml: values.contentHtml ?? null,
				conversationId: parsedConversationId,
				createdAt: now,
				role: values.role,
				userId: parsedUserId,
			})
			.returning();

		await tx
			.update(conversations)
			.set({ lastMessageAt: now, updatedAt: now })
			.where(eq(conversations.id, parsedConversationId));

		return message;
	});
}
