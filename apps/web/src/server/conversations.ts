import {
	createConversation as createConversationRecord,
	createConversationSchema,
	deleteConversation as deleteConversationRecord,
	getConversationById as getConversationRecordById,
	listConversations as listConversationRecords,
	listMessages as listMessageRecords,
	renameConversation as renameConversationRecord,
	renameConversationSchema,
} from '@bookeeping-agent/db/queries/conversations';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { ensureSession } from '../lib/auth-functions';

const conversationIdInputSchema = z.object({
	id: z.uuid(),
});

const renameConversationInputSchema = z.object({
	id: z.uuid(),
	input: renameConversationSchema,
});

const listMessagesInputSchema = z.object({
	conversationId: z.uuid(),
});

export const listConversations = createServerFn({ method: 'GET' }).handler(
	async () => {
		const session = await ensureSession();

		return await listConversationRecords(session.user.id);
	}
);

export const getConversationById = createServerFn({ method: 'GET' })
	.validator((data: unknown) => conversationIdInputSchema.parse(data))
	.handler(async ({ data }) => {
		const session = await ensureSession();

		return await getConversationRecordById(session.user.id, data.id);
	});

export const createConversation = createServerFn({ method: 'POST' })
	.validator((data: unknown) => createConversationSchema.optional().parse(data))
	.handler(async ({ data }) => {
		const session = await ensureSession();

		return await createConversationRecord(session.user.id, data ?? {});
	});

export const renameConversation = createServerFn({ method: 'POST' })
	.validator((data: unknown) => renameConversationInputSchema.parse(data))
	.handler(async ({ data }) => {
		const session = await ensureSession();

		return await renameConversationRecord(session.user.id, data.id, data.input);
	});

export const deleteConversation = createServerFn({ method: 'POST' })
	.validator((data: unknown) => conversationIdInputSchema.parse(data))
	.handler(async ({ data }) => {
		const session = await ensureSession();

		return await deleteConversationRecord(session.user.id, data.id);
	});

export const listMessages = createServerFn({ method: 'GET' })
	.validator((data: unknown) => listMessagesInputSchema.parse(data))
	.handler(async ({ data }) => {
		const session = await ensureSession();

		return await listMessageRecords(session.user.id, data.conversationId);
	});
