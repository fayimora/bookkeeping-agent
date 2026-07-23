import { Schema } from 'effect';

import {
	CategoryId,
	ConversationId,
	ExpenseId,
	TrimmedNonEmptyString,
	UserId,
} from './primitives';

export class ExpenseNotFound extends Schema.TaggedErrorClass<ExpenseNotFound>()(
	'ExpenseNotFound',
	{ expenseId: ExpenseId }
) {}

export class CategoryNotFound extends Schema.TaggedErrorClass<CategoryNotFound>()(
	'CategoryNotFound',
	{ identifier: TrimmedNonEmptyString }
) {}

export class ConversationNotFound extends Schema.TaggedErrorClass<ConversationNotFound>()(
	'ConversationNotFound',
	{ conversationId: ConversationId }
) {}

export class CategoryNotOwned extends Schema.TaggedErrorClass<CategoryNotOwned>()(
	'CategoryNotOwned',
	{
		categoryId: CategoryId,
		userId: UserId,
	}
) {}

export class ConversationNotOwned extends Schema.TaggedErrorClass<ConversationNotOwned>()(
	'ConversationNotOwned',
	{
		conversationId: ConversationId,
		userId: UserId,
	}
) {}

export class EmptyUpdate extends Schema.TaggedErrorClass<EmptyUpdate>()(
	'EmptyUpdate',
	{ entity: Schema.Literals(['expense', 'category']) }
) {}

export class ConflictingUpdate extends Schema.TaggedErrorClass<ConflictingUpdate>()(
	'ConflictingUpdate',
	{ field: Schema.Literals(['category', 'description']) }
) {}
