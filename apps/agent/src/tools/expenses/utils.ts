import { getCategoryBySlug } from '@bookeeping-agent/db/queries/categories';
import type { ListExpensesFilters } from '@bookeeping-agent/db/queries/expenses';

import type {
	CreateExpenseToolInput,
	ListExpensesToolInput,
} from './schemas.ts';

export async function resolveExpenseFilters(input: ListExpensesToolInput) {
	const filters: ListExpensesFilters = {
		from: input.from,
		to: input.to,
		search: input.search?.trim(),
	};

	if (input.categoryId) {
		filters.categoryId = input.categoryId;
		return filters;
	}

	if (input.categorySlug) {
		const categorySlug = input.categorySlug.trim();
		const category = await getCategoryBySlug(categorySlug);

		if (!category) {
			throw new Error(`Unknown category slug: ${categorySlug}`);
		}

		filters.categoryId = category.id;
	}

	return filters;
}

export async function resolveExpenseCategoryId(input: CreateExpenseToolInput) {
	if (input.categoryId) {
		return input.categoryId;
	}

	if (!input.categorySlug) {
		throw new Error(
			'Provide categoryId or categorySlug before creating an expense.'
		);
	}

	const categorySlug = input.categorySlug.trim();
	const category = await getCategoryBySlug(categorySlug);

	if (!category) {
		throw new Error(`Unknown category slug: ${categorySlug}`);
	}

	return category.id;
}

export function formatMoney(amountCents: number, currency: string) {
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency,
	}).format(amountCents / 100);
}
