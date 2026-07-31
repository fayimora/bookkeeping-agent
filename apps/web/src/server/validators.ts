import {
	Category,
	CategoryId,
	ConversationId,
	CreateCategoryInput,
	CreateConversationInput,
	CreateExpenseInput,
	ExpenseId,
	ListExpensesFilters,
	RenameConversationInput,
	SendChatMessageInput,
	UpdateCategoryInput,
	UpdateExpenseInput,
} from '@bookeeping-agent/domain';
import { setResponseStatus } from '@tanstack/react-start/server';
import { Schema } from 'effect';

const ExpenseIdInput = Schema.Struct({ id: ExpenseId });
const UpdateExpenseRequest = Schema.Struct({
	id: ExpenseId,
	input: UpdateExpenseInput,
});
const OptionalExpenseFilters = Schema.UndefinedOr(ListExpensesFilters);

const CategoryIdInput = Schema.Struct({ id: CategoryId });
const CategorySlugInput = Schema.Struct({ slug: Category.fields.slug });
const UpdateCategoryRequest = Schema.Struct({
	id: CategoryId,
	input: UpdateCategoryInput,
});

const ConversationIdInput = Schema.Struct({ id: ConversationId });
const RenameConversationRequest = Schema.Struct({
	id: ConversationId,
	input: RenameConversationInput,
});
const ListMessagesRequest = Schema.Struct({ conversationId: ConversationId });
const OptionalCreateConversation = Schema.UndefinedOr(CreateConversationInput);

/** Run Effect's Standard Schema adapter inside TanStack's validator boundary. */
const standard = <S extends Schema.ConstraintDecoder<unknown>>(schema: S) => {
	const adapter = Schema.toStandardSchemaV1(schema);
	return async (value: unknown): Promise<S['Type']> => {
		const result = await adapter['~standard'].validate(value);
		if (result.issues !== undefined) {
			setResponseStatus(400);
			throw new Error('Invalid request.');
		}
		return result.value;
	};
};

export const ExpenseValidators = {
	create: standard(CreateExpenseInput),
	id: standard(ExpenseIdInput),
	list: standard(OptionalExpenseFilters),
	update: standard(UpdateExpenseRequest),
};

export const CategoryValidators = {
	create: standard(CreateCategoryInput),
	id: standard(CategoryIdInput),
	slug: standard(CategorySlugInput),
	update: standard(UpdateCategoryRequest),
};

export const ConversationValidators = {
	create: standard(OptionalCreateConversation),
	id: standard(ConversationIdInput),
	listMessages: standard(ListMessagesRequest),
	rename: standard(RenameConversationRequest),
};

export const SendChatMessageValidator = standard(SendChatMessageInput);
