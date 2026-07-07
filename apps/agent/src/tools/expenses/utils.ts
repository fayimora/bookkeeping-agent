import { getCategoryBySlug } from '@bookeeping-agent/db/queries/categories';
import type { ListExpensesFilters } from '@bookeeping-agent/db/queries/expenses';

import type {
	CreateExpenseToolInput,
	ListExpensesToolInput,
	UpdateExpenseToolInput,
} from './schemas.ts';

export async function resolveExpenseFilters(
	userId: string,
	input: ListExpensesToolInput
) {
	const filters: ListExpensesFilters = {
		from: input.from,
		search: input.search?.trim(),
		to: input.to,
	};

	if (input.categoryId) {
		filters.categoryId = input.categoryId;
		return filters;
	}

	if (input.categorySlug) {
		const categorySlug = input.categorySlug.trim();
		const category = await getCategoryBySlug(userId, categorySlug);

		if (!category) {
			throw new Error(`Unknown category slug: ${categorySlug}`);
		}

		filters.categoryId = category.id;
	}

	return filters;
}

export async function resolveExpenseCategoryId(
	userId: string,
	input: CreateExpenseToolInput | UpdateExpenseToolInput
) {
	if (input.categoryId) {
		return input.categoryId;
	}

	if (!input.categorySlug) {
		throw new Error('Provide categoryId or categorySlug.');
	}

	const categorySlug = input.categorySlug.trim();
	const category = await getCategoryBySlug(userId, categorySlug);

	if (!category) {
		throw new Error(`Unknown category slug: ${categorySlug}`);
	}

	return category.id;
}

export function formatMoney(amountCents: number, currency: string) {
	return new Intl.NumberFormat('en-GB', {
		currency,
		style: 'currency',
	}).format(amountCents / 100);
}
