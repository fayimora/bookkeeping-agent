import { Schema } from 'effect';

import {
	AmountCents,
	CategoryId,
	ConversationId,
	Currency,
	ExpenseId,
	IsoDate,
	MessageId,
	TrimmedNonEmptyString,
	UserId,
} from './primitives';

const CategoryName = TrimmedNonEmptyString.check(Schema.isMaxLength(100));
const CategorySlug = TrimmedNonEmptyString.check(Schema.isMaxLength(100));
const ConversationTitle = TrimmedNonEmptyString.check(Schema.isMaxLength(200));
const Vendor = TrimmedNonEmptyString.check(Schema.isMaxLength(200));

export const MessageRole = Schema.Literals(['user', 'assistant']);
export type MessageRole = typeof MessageRole.Type;

export const Expense = Schema.Struct({
	amountCents: AmountCents,
	categoryId: Schema.NullOr(CategoryId),
	createdAt: Schema.DateValid,
	currency: Currency,
	date: IsoDate,
	description: Schema.NullOr(TrimmedNonEmptyString),
	id: ExpenseId,
	updatedAt: Schema.DateValid,
	userId: UserId,
	vendor: Vendor,
});
export interface Expense extends Schema.Schema.Type<typeof Expense> {}

export const Category = Schema.Struct({
	createdAt: Schema.DateValid,
	id: CategoryId,
	name: CategoryName,
	slug: CategorySlug,
	updatedAt: Schema.DateValid,
	userId: UserId,
});
export interface Category extends Schema.Schema.Type<typeof Category> {}

export const Conversation = Schema.Struct({
	createdAt: Schema.DateValid,
	id: ConversationId,
	lastMessageAt: Schema.DateValid,
	title: ConversationTitle,
	updatedAt: Schema.DateValid,
	userId: UserId,
});
export interface Conversation extends Schema.Schema.Type<typeof Conversation> {}

export const Message = Schema.Struct({
	attachmentNames: Schema.NullOr(Schema.Array(Schema.NonEmptyString)),
	content: Schema.NonEmptyString,
	contentHtml: Schema.NullOr(Schema.String),
	conversationId: ConversationId,
	createdAt: Schema.DateValid,
	id: MessageId,
	role: MessageRole,
	userId: UserId,
});
export interface Message extends Schema.Schema.Type<typeof Message> {}
