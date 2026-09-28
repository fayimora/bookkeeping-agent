import {
	CategoryId,
	CategoryNotFound,
	ConflictingUpdate,
	ListExpensesFilters,
	UpdateExpenseInput as UpdateExpenseInputSchema,
	type UserId,
} from '@bookeeping-agent/domain';
import { Effect, Schema } from 'effect';

import { resolveCategory } from '../categories/tools';
import { omitUndefined } from '../shared';
import type {
	CreateExpenseToolInput,
	ExpenseFilterToolInput,
	UpdateExpenseToolInput,
} from './schemas';

const resolveCategorySlug = (userId: UserId, slug: string) =>
	resolveCategory(userId, { slug }).pipe(Effect.map((category) => category.id));

export const resolveExpenseFilters = Effect.fn(
	'AgentTools.resolveExpenseFilters'
)(function* (userId: UserId, input: ExpenseFilterToolInput) {
	let categoryId: CategoryId | undefined;
	if (input.categoryId) {
		categoryId = yield* Schema.decodeUnknownEffect(CategoryId)(
			input.categoryId
		);
	} else if (input.categorySlug) {
		categoryId = yield* resolveCategorySlug(userId, input.categorySlug);
	}

	return yield* Schema.decodeUnknownEffect(ListExpensesFilters)(
		omitUndefined({
			categoryId,
			from: input.from,
			search: input.search,
			to: input.to,
		})
	);
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

		if (input.categoryId !== undefined || input.categorySlug !== undefined) {
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

	return input.description === undefined
		? {}
		: { description: input.description };
});

export const buildUpdateExpenseValues = Effect.fn(
	'AgentTools.buildUpdateExpenseValues'
)(function* (userId: UserId, input: UpdateExpenseToolInput) {
	const categoryUpdate = yield* getCategoryUpdate(userId, input);
	const descriptionUpdate = yield* getDescriptionUpdate(input);
	const values = {
		...categoryUpdate,
		...descriptionUpdate,
		...omitUndefined({
			amountCents: input.amountCents,
			currency: input.currency,
			date: input.date,
			vendor: input.vendor,
		}),
	};

	return yield* Schema.decodeUnknownEffect(UpdateExpenseInputSchema)(values);
});
