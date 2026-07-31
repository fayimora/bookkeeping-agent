import { Effect, Schema } from 'effect';

import {
	maxAttachments,
	maxImageDataLength,
	type SupportedImageType as SupportedImageTypeValue,
	supportedImageTypes,
} from './chat-attachments';
import { Category, Conversation, Expense, Message } from './models';

// biome-ignore lint/performance/noBarrelFile: Preserve the established domain input API while sharing a pure client module.
export {
	isSupportedImageType,
	maxAttachments,
	maxImageBytes,
	maxImageDataLength,
	supportedImageTypes,
} from './chat-attachments';

export const CreateExpenseInput = Schema.Struct({
	amountCents: Expense.fields.amountCents,
	categoryId: Schema.optionalKey(Expense.fields.categoryId),
	currency: Expense.fields.currency.pipe(
		Schema.withDecodingDefaultKey(Effect.succeed('GBP'))
	),
	date: Expense.fields.date,
	description: Schema.optionalKey(Expense.fields.description),
	vendor: Expense.fields.vendor,
});
export interface CreateExpenseInput
	extends Schema.Schema.Type<typeof CreateExpenseInput> {}

export const UpdateExpenseInput = Schema.Struct({
	amountCents: Schema.optionalKey(Expense.fields.amountCents),
	categoryId: Schema.optionalKey(Expense.fields.categoryId),
	currency: Schema.optionalKey(Expense.fields.currency),
	date: Schema.optionalKey(Expense.fields.date),
	description: Schema.optionalKey(Expense.fields.description),
	vendor: Schema.optionalKey(Expense.fields.vendor),
});
export interface UpdateExpenseInput
	extends Schema.Schema.Type<typeof UpdateExpenseInput> {}

export const ListExpensesFilters = Schema.Struct({
	categoryId: Schema.optionalKey(Category.fields.id),
	from: Schema.optionalKey(Expense.fields.date),
	search: Schema.optionalKey(Schema.Trim.check(Schema.isNonEmpty())),
	to: Schema.optionalKey(Expense.fields.date),
});
export interface ListExpensesFilters
	extends Schema.Schema.Type<typeof ListExpensesFilters> {}

export const CreateCategoryInput = Schema.Struct({
	name: Category.fields.name,
	slug: Category.fields.slug,
});
export interface CreateCategoryInput
	extends Schema.Schema.Type<typeof CreateCategoryInput> {}

export const UpdateCategoryInput = Schema.Struct({
	name: Schema.optionalKey(Category.fields.name),
	slug: Schema.optionalKey(Category.fields.slug),
});
export interface UpdateCategoryInput
	extends Schema.Schema.Type<typeof UpdateCategoryInput> {}

export const CreateConversationInput = Schema.Struct({
	title: Schema.optionalKey(Conversation.fields.title),
});
export interface CreateConversationInput
	extends Schema.Schema.Type<typeof CreateConversationInput> {}

export const RenameConversationInput = Schema.Struct({
	title: Conversation.fields.title,
});
export interface RenameConversationInput
	extends Schema.Schema.Type<typeof RenameConversationInput> {}

export const AddMessageInput = Schema.Struct({
	attachmentNames: Schema.optionalKey(Message.fields.attachmentNames),
	content: Message.fields.content,
	contentHtml: Schema.optionalKey(Message.fields.contentHtml),
	role: Message.fields.role,
});
export interface AddMessageInput
	extends Schema.Schema.Type<typeof AddMessageInput> {}

export const SupportedImageType = Schema.Literals(supportedImageTypes);
export type SupportedImageType = SupportedImageTypeValue;

export const ChatImage = Schema.Struct({
	data: Schema.NonEmptyString.check(Schema.isBase64()).check(
		Schema.isMaxLength(maxImageDataLength)
	),
	mimeType: SupportedImageType,
	name: Schema.optionalKey(
		Schema.Trim.check(Schema.isNonEmpty()).check(Schema.isMaxLength(255))
	),
	type: Schema.Literal('image'),
});
export interface ChatImage extends Schema.Schema.Type<typeof ChatImage> {}

export const SendChatMessageInput = Schema.Struct({
	conversationId: Conversation.fields.id,
	images: Schema.optionalKey(
		Schema.Array(ChatImage).check(Schema.isMaxLength(maxAttachments))
	),
	message: Schema.Trim.check(Schema.isNonEmpty()).check(
		Schema.isMaxLength(4000)
	),
});
export interface SendChatMessageInput
	extends Schema.Schema.Type<typeof SendChatMessageInput> {}
