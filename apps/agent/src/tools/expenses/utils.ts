import { CategoriesRepo } from '@bookeeping-agent/db';
import {
	Category,
	CategoryId,
	CategoryNotFound,
	ConflictingUpdate,
	EmptyUpdate,
	ListExpensesFilters,
	UpdateExpenseInput as UpdateExpenseInputSchema,
	type UserId,
} from '@bookeeping-agent/domain';
import { Effect, Schema } from 'effect';

import { retryTransientRead } from '../shared';
import type {
	CreateExpenseToolInput,
	ListExpensesToolInput,
	UpdateExpenseToolInput,
} from './schemas';

interface RawUpdateExpenseValues {
	amountCents?: number;
	categoryId?: null | string;
	currency?: string;
	date?: string;
	description?: null | string;
	vendor?: string;
}

function hasValue<T>(value: T | undefined): value is T {
	return value !== undefined;
}

const resolveCategorySlug = Effect.fn('AgentTools.resolveCategorySlug')(
	function* (userId: UserId, value: string) {
		const slug = yield* Schema.decodeUnknownEffect(Category.fields.slug)(value);
		const categories = yield* CategoriesRepo;
		const category = yield* retryTransientRead(
			categories.getBySlug(userId, slug)
		);
		return category.id;
	}
);

export const resolveExpenseFilters = Effect.fn(
	'AgentTools.resolveExpenseFilters'
)(function* (userId: UserId, input: ListExpensesToolInput) {
	let categoryId: CategoryId | undefined;
	if (input.categoryId) {
		categoryId = yield* Schema.decodeUnknownEffect(CategoryId)(
			input.categoryId
		);
	} else if (input.categorySlug) {
		categoryId = yield* resolveCategorySlug(userId, input.categorySlug);
	}

	const filters: {
		categoryId?: CategoryId;
		from?: string;
		search?: string;
		to?: string;
	} = {};
	if (categoryId !== undefined) {
		filters.categoryId = categoryId;
	}
	if (input.from !== undefined) {
		filters.from = input.from;
	}
	if (input.search !== undefined) {
		filters.search = input.search;
	}
	if (input.to !== undefined) {
		filters.to = input.to;
	}

	return yield* Schema.decodeUnknownEffect(ListExpensesFilters)(filters);
});

export const resolveExpenseCategoryId = Effect.fn(
	'AgentTools.resolveExpenseCategoryId'
)(function* (
	userId: UserId,
	input: CreateExpenseToolInput | UpdateExpenseToolInput
) {
	if (input.categoryId) {
		return yield* Schema.decodeUnknownEffect(CategoryId)(input.categoryId);
	}

	if (input.categorySlug) {
		return yield* resolveCategorySlug(userId, input.categorySlug);
	}

	return yield* Effect.fail(
		CategoryNotFound.make({ identifier: 'categoryId or categorySlug' })
	);
});

export const getCategoryUpdate = Effect.fn('AgentTools.getCategoryUpdate')(
	function* (userId: UserId, input: UpdateExpenseToolInput) {
		if (
			input.clearCategory &&
			(input.categoryId !== undefined || input.categorySlug !== undefined)
		) {
			return yield* Effect.fail(ConflictingUpdate.make({ field: 'category' }));
		}

		if (input.clearCategory) {
			return { categoryId: null };
		}

		if (hasValue(input.categoryId) || hasValue(input.categorySlug)) {
			return {
				categoryId: yield* resolveExpenseCategoryId(userId, input),
			};
		}

		return {};
	}
);

export const getDescriptionUpdate = Effect.fn(
	'AgentTools.getDescriptionUpdate'
)(function* (input: UpdateExpenseToolInput) {
	if (input.clearDescription && input.description !== undefined) {
		return yield* Effect.fail(ConflictingUpdate.make({ field: 'description' }));
	}

	if (input.clearDescription) {
		return { description: null };
	}

	return hasValue(input.description) ? { description: input.description } : {};
});

export const buildUpdateExpenseValues = Effect.fn(
	'AgentTools.buildUpdateExpenseValues'
)(function* (userId: UserId, input: UpdateExpenseToolInput) {
	const categoryUpdate = yield* getCategoryUpdate(userId, input);
	const descriptionUpdate = yield* getDescriptionUpdate(input);
	const values: RawUpdateExpenseValues = {
		...categoryUpdate,
		...descriptionUpdate,
	};

	if (hasValue(input.vendor)) {
		values.vendor = input.vendor;
	}
	if (hasValue(input.date)) {
		values.date = input.date;
	}
	if (hasValue(input.amountCents)) {
		values.amountCents = input.amountCents;
	}
	if (hasValue(input.currency)) {
		values.currency = input.currency;
	}

	if (Object.keys(values).length === 0) {
		return yield* Effect.fail(EmptyUpdate.make({ entity: 'expense' }));
	}

	return yield* Schema.decodeUnknownEffect(UpdateExpenseInputSchema)(values);
});

export function formatMoney(amountCents: number, currency: string) {
	return new Intl.NumberFormat('en-GB', {
		currency,
		style: 'currency',
	}).format(amountCents / 100);
}
