import { getCategoryBySlug } from '@bookeeping-agent/db/queries/categories';
import type { ListExpensesFilters } from '@bookeeping-agent/db/queries/expenses';
import { Result } from 'better-result';

import { ToolInputError } from '../result.ts';
import type {
	CreateExpenseToolInput,
	ListExpensesToolInput,
	UpdateExpenseToolInput,
} from './schemas.ts';

export function resolveExpenseFilters(
	userId: string,
	input: ListExpensesToolInput
) {
	return Result.gen(async function* () {
		const filters: ListExpensesFilters = {
			from: input.from,
			to: input.to,
			search: input.search?.trim(),
		};

		if (input.categoryId) {
			filters.categoryId = input.categoryId;
			return Result.ok(filters);
		}

		if (input.categorySlug) {
			const categorySlug = input.categorySlug.trim();
			const category = yield* Result.await(
				getCategoryBySlug(userId, categorySlug)
			);

			if (!category) {
				return Result.err(
					new ToolInputError({
						message: `Unknown category slug: ${categorySlug}`,
					})
				);
			}

			filters.categoryId = category.id;
		}

		return Result.ok(filters);
	});
}

export function resolveExpenseCategoryId(
	userId: string,
	input: CreateExpenseToolInput | UpdateExpenseToolInput
) {
	return Result.gen(async function* () {
		if (input.categoryId) {
			return Result.ok(input.categoryId);
		}

		if (!input.categorySlug) {
			return Result.err(
				new ToolInputError({ message: 'Provide categoryId or categorySlug.' })
			);
		}

		const categorySlug = input.categorySlug.trim();
		const category = yield* Result.await(
			getCategoryBySlug(userId, categorySlug)
		);

		if (!category) {
			return Result.err(
				new ToolInputError({
					message: `Unknown category slug: ${categorySlug}`,
				})
			);
		}

		return Result.ok(category.id);
	});
}

export function formatMoney(amountCents: number, currency: string) {
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency,
	}).format(amountCents / 100);
}
