import { Schema } from 'effect';

import {
	AddMessageInput,
	CreateCategoryInput,
	CreateConversationInput,
	CreateExpenseInput,
	ListExpensesFilters,
	RenameConversationInput,
	SendChatMessageInput,
	UpdateCategoryInput,
	UpdateExpenseInput,
} from './inputs';

export const CreateExpenseInputStandardSchema =
	Schema.toStandardSchemaV1(CreateExpenseInput);
export const UpdateExpenseInputStandardSchema =
	Schema.toStandardSchemaV1(UpdateExpenseInput);
export const ListExpensesFiltersStandardSchema =
	Schema.toStandardSchemaV1(ListExpensesFilters);
export const CreateCategoryInputStandardSchema =
	Schema.toStandardSchemaV1(CreateCategoryInput);
export const UpdateCategoryInputStandardSchema =
	Schema.toStandardSchemaV1(UpdateCategoryInput);
export const CreateConversationInputStandardSchema = Schema.toStandardSchemaV1(
	CreateConversationInput
);
export const RenameConversationInputStandardSchema = Schema.toStandardSchemaV1(
	RenameConversationInput
);
export const AddMessageInputStandardSchema =
	Schema.toStandardSchemaV1(AddMessageInput);
export const SendChatMessageInputStandardSchema =
	Schema.toStandardSchemaV1(SendChatMessageInput);
