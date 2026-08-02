import { CategoriesRepo, ExpensesRepo } from '@bookeeping-agent/db';
import {
	type Category,
	type Expense,
	type ListExpensesFilters,
	UserId,
} from '@bookeeping-agent/domain';
import { Effect, Schema } from 'effect';

import { retryTransientRead } from '../shared';
import type { SpendingBreakdownToolInput } from './schemas';
import { formatMoney, resolveExpenseFilters } from './utils';

type SpendingGroupBy = SpendingBreakdownToolInput['groupBy'];

// biome-ignore lint/style/useConsistentTypeDefinitions: Flue's JsonValue envelope requires structural object aliases.
type NormalizedSpendingFilters = {
	categoryId?: string;
	from?: string;
	search?: string;
	to?: string;
};

// biome-ignore lint/style/useConsistentTypeDefinitions: Flue's JsonValue envelope requires structural object aliases.
type SpendingMoneyAggregate = {
	amountCents: number;
	currency: string;
	expenseCount: number;
	formatted: string;
};

type SpendingMonthRow = SpendingMoneyAggregate & {
	month: string;
};

type SpendingCategoryRow = SpendingMoneyAggregate & {
	categoryId: null | string;
	categoryName: string;
	categorySlug: null | string;
};

type SpendingMonthCategoryRow = SpendingCategoryRow & {
	month: string;
};

export type SpendingBreakdownRow =
	| SpendingCategoryRow
	| SpendingMonthCategoryRow
	| SpendingMonthRow;

// biome-ignore lint/style/useConsistentTypeDefinitions: Flue's JsonValue envelope requires a structural object alias.
export type SpendingBreakdown = {
	dateRange: {
		from: null | string;
		to: null | string;
	};
	expenseCount: number;
	filters: NormalizedSpendingFilters;
	groupBy: SpendingGroupBy;
	periods: string[];
	rows: SpendingBreakdownRow[];
	totals: SpendingMoneyAggregate[];
};

interface AggregateSeed {
	amountCents: number;
	categoryId: null | string;
	currency: string;
	expenseCount: number;
	month: null | string;
}

const uncategorized = {
	id: null,
	name: 'Uncategorized',
	slug: null,
};

function normalizeFilters(
	filters: ListExpensesFilters
): NormalizedSpendingFilters {
	const normalized: NormalizedSpendingFilters = {};
	if (filters.categoryId !== undefined) {
		normalized.categoryId = filters.categoryId;
	}
	if (filters.from !== undefined) {
		normalized.from = filters.from;
	}
	if (filters.search !== undefined) {
		normalized.search = filters.search;
	}
	if (filters.to !== undefined) {
		normalized.to = filters.to;
	}
	return normalized;
}

function effectiveDateRange(
	expenses: readonly Expense[],
	filters: ListExpensesFilters
) {
	let earliest: string | null = null;
	let latest: string | null = null;
	for (const expense of expenses) {
		if (earliest === null || expense.date < earliest) {
			earliest = expense.date;
		}
		if (latest === null || expense.date > latest) {
			latest = expense.date;
		}
	}

	return {
		from: filters.from ?? earliest,
		to: filters.to ?? latest,
	};
}

function monthIndex(value: string) {
	const [yearText, monthText] = value.slice(0, 7).split('-');
	if (yearText === undefined || monthText === undefined) {
		return;
	}
	const year = Number(yearText);
	const month = Number(monthText);
	if (
		!(Number.isInteger(year) && Number.isInteger(month)) ||
		month < 1 ||
		month > 12
	) {
		return;
	}
	return year * 12 + month - 1;
}

function requestedPeriods(from: null | string, to: null | string) {
	if (from === null || to === null) {
		return [];
	}
	const first = monthIndex(from);
	const last = monthIndex(to);
	if (first === undefined || last === undefined || first > last) {
		return [];
	}

	const periods: string[] = [];
	for (let index = first; index <= last; index += 1) {
		const year = Math.floor(index / 12);
		const month = (index % 12) + 1;
		periods.push(
			`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
		);
	}
	return periods;
}

function categoryMetadata(
	categoryId: null | string,
	categoriesById: ReadonlyMap<string, Category>
) {
	if (categoryId === null) {
		return uncategorized;
	}
	const category = categoriesById.get(categoryId);
	return category === undefined
		? { id: categoryId, name: 'Unknown category', slug: null }
		: { id: category.id, name: category.name, slug: category.slug };
}

function addAggregate(
	aggregates: Map<string, AggregateSeed>,
	key: string,
	expense: Expense,
	month: null | string,
	categoryId: null | string
) {
	const existing = aggregates.get(key);
	if (existing === undefined) {
		aggregates.set(key, {
			amountCents: expense.amountCents,
			categoryId,
			currency: expense.currency,
			expenseCount: 1,
			month,
		});
		return;
	}
	existing.amountCents += expense.amountCents;
	existing.expenseCount += 1;
}

function moneyAggregate(seed: AggregateSeed): SpendingMoneyAggregate {
	return {
		amountCents: seed.amountCents,
		currency: seed.currency,
		expenseCount: seed.expenseCount,
		formatted: formatMoney(seed.amountCents, seed.currency),
	};
}

function buildRows(
	groupBy: SpendingGroupBy,
	sortedGroups: readonly AggregateSeed[],
	categoriesById: ReadonlyMap<string, Category>
) {
	const rows: SpendingBreakdownRow[] = [];
	for (const seed of sortedGroups) {
		const money = moneyAggregate(seed);
		if (groupBy === 'month' && seed.month !== null) {
			rows.push({ ...money, month: seed.month });
		} else if (groupBy === 'category') {
			const category = categoryMetadata(seed.categoryId, categoriesById);
			rows.push({
				...money,
				categoryId: category.id,
				categoryName: category.name,
				categorySlug: category.slug,
			});
		} else if (groupBy === 'month_category' && seed.month !== null) {
			const category = categoryMetadata(seed.categoryId, categoriesById);
			rows.push({
				...money,
				categoryId: category.id,
				categoryName: category.name,
				categorySlug: category.slug,
				month: seed.month,
			});
		}
	}
	return rows;
}

export function buildSpendingBreakdown(
	expenses: readonly Expense[],
	categories: readonly Category[],
	filters: ListExpensesFilters,
	groupBy: SpendingGroupBy
): SpendingBreakdown {
	const categoriesById = new Map<string, Category>(
		categories.map((category) => [category.id, category])
	);
	const totalsByCurrency = new Map<string, AggregateSeed>();
	const grouped = new Map<string, AggregateSeed>();

	for (const expense of expenses) {
		addAggregate(totalsByCurrency, expense.currency, expense, null, null);

		if (groupBy !== 'total') {
			const month =
				groupBy === 'month' || groupBy === 'month_category'
					? expense.date.slice(0, 7)
					: null;
			const categoryId =
				groupBy === 'category' || groupBy === 'month_category'
					? expense.categoryId
					: null;
			const key = `${month ?? ''}\u0000${categoryId ?? ''}\u0000${expense.currency}`;
			addAggregate(grouped, key, expense, month, categoryId);
		}
	}

	const categorySortKey = (categoryId: null | string) => {
		if (categoryId === null) {
			return '\uffff';
		}
		const category = categoriesById.get(categoryId);
		return category?.slug ?? categoryId;
	};
	const sortedGroups = [...grouped.values()].sort(
		(left, right) =>
			(left.month ?? '').localeCompare(right.month ?? '') ||
			categorySortKey(left.categoryId).localeCompare(
				categorySortKey(right.categoryId)
			) ||
			left.currency.localeCompare(right.currency)
	);

	const rows = buildRows(groupBy, sortedGroups, categoriesById);
	const dateRange = effectiveDateRange(expenses, filters);
	return {
		dateRange,
		expenseCount: expenses.length,
		filters: normalizeFilters(filters),
		groupBy,
		periods: requestedPeriods(dateRange.from, dateRange.to),
		rows,
		totals: [...totalsByCurrency.values()]
			.sort((left, right) => left.currency.localeCompare(right.currency))
			.map(moneyAggregate),
	};
}

export const spendingBreakdownWorkflow = Effect.fn(
	'AgentTools.getSpendingBreakdown'
)(function* (userIdValue: string, input: SpendingBreakdownToolInput) {
	const userId = yield* Schema.decodeUnknownEffect(UserId)(userIdValue);
	const filters = yield* resolveExpenseFilters(userId, input);
	const expensesRepo = yield* ExpensesRepo;
	const expenses = yield* retryTransientRead(
		expensesRepo.list(userId, filters)
	);

	let categories: readonly Category[] = [];
	if (input.groupBy === 'category' || input.groupBy === 'month_category') {
		const categoriesRepo = yield* CategoriesRepo;
		categories = yield* retryTransientRead(categoriesRepo.list(userId));
	}

	return buildSpendingBreakdown(expenses, categories, filters, input.groupBy);
});
