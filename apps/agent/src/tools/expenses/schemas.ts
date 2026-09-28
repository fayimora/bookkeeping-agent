import { isoDatePattern, maxExpensePageSize } from '@bookeeping-agent/domain';
import {
	boolean,
	description,
	type InferOutput,
	integer,
	maxLength,
	maxValue,
	minLength,
	minValue,
	number,
	object,
	optional,
	picklist,
	pipe,
	regex,
	string,
} from 'valibot';

const expenseFilterParameters = object({
	categoryId: optional(
		pipe(string(), description('Category UUID to filter by.'))
	),
	categorySlug: optional(
		pipe(
			string(),
			description('Category slug to filter by, such as food or travel.'),
			minLength(1)
		)
	),
	from: optional(
		pipe(
			string(),
			description('Start date in YYYY-MM-DD format.'),
			regex(isoDatePattern)
		)
	),
	search: optional(
		pipe(
			string(),
			description('Search text for vendor or description.'),
			minLength(1)
		)
	),
	to: optional(
		pipe(
			string(),
			description('End date in YYYY-MM-DD format.'),
			regex(isoDatePattern)
		)
	),
});

export type ExpenseFilterToolInput = InferOutput<
	typeof expenseFilterParameters
>;

export const defaultExpensePageSize = 50;

export const listExpensesParameters = object({
	...expenseFilterParameters.entries,
	limit: optional(
		pipe(
			number(),
			description(
				`Maximum expenses to return. Defaults to ${defaultExpensePageSize}.`
			),
			integer(),
			minValue(1),
			maxValue(maxExpensePageSize)
		)
	),
	offset: optional(
		pipe(
			number(),
			description('Number of matching expenses to skip, for paging.'),
			integer(),
			minValue(0)
		)
	),
});

export type ListExpensesToolInput = InferOutput<typeof listExpensesParameters>;

// Filters only: aggregates must always cover every matching expense.
export const spendingBreakdownParameters = object({
	...expenseFilterParameters.entries,
	groupBy: pipe(
		picklist(['total', 'month', 'category', 'month_category']),
		description('How to group spending totals.')
	),
});

export type SpendingBreakdownToolInput = InferOutput<
	typeof spendingBreakdownParameters
>;

const expenseIdParameter = pipe(
	string(),
	description('Expense UUID.'),
	minLength(1)
);

export const getExpenseParameters = object({
	id: expenseIdParameter,
});

export const createExpenseParameters = object({
	amountCents: pipe(
		number(),
		description('Amount in minor units, for example £12.50 is 1250.'),
		integer(),
		minValue(1)
	),
	categoryId: optional(
		pipe(string(), description('Category UUID. Use this or categorySlug.'))
	),
	categorySlug: optional(
		pipe(
			string(),
			description(
				'Category slug, such as food or travel. Use this or categoryId.'
			),
			minLength(1)
		)
	),
	currency: optional(
		pipe(
			string(),
			description('Three-letter currency code. Defaults to GBP.'),
			minLength(3),
			maxLength(3)
		)
	),
	date: pipe(
		string(),
		description('Expense date in YYYY-MM-DD format.'),
		regex(isoDatePattern)
	),
	description: optional(
		pipe(
			string(),
			description('Short optional note or description.'),
			minLength(1)
		)
	),
	vendor: pipe(
		string(),
		description('Merchant or vendor name.'),
		minLength(1),
		maxLength(200)
	),
});

export type CreateExpenseToolInput = InferOutput<
	typeof createExpenseParameters
>;

export const updateExpenseParameters = object({
	amountCents: optional(
		pipe(
			number(),
			description('Updated amount in minor units, for example £12.50 is 1250.'),
			integer(),
			minValue(1)
		)
	),
	categoryId: optional(
		pipe(
			string(),
			description('Updated category UUID. Use this or categorySlug.')
		)
	),
	categorySlug: optional(
		pipe(
			string(),
			description(
				'Updated category slug, such as food or travel. Use this or categoryId.'
			),
			minLength(1)
		)
	),
	clearCategory: optional(
		pipe(boolean(), description('Set true to remove the expense category.'))
	),
	clearDescription: optional(
		pipe(boolean(), description('Set true to remove the expense description.'))
	),
	currency: optional(
		pipe(
			string(),
			description('Updated three-letter currency code.'),
			minLength(3),
			maxLength(3)
		)
	),
	date: optional(
		pipe(
			string(),
			description('Updated expense date in YYYY-MM-DD format.'),
			regex(isoDatePattern)
		)
	),
	description: optional(
		pipe(
			string(),
			description('Updated short optional note or description.'),
			minLength(1)
		)
	),
	id: expenseIdParameter,
	vendor: optional(
		pipe(
			string(),
			description('Updated merchant or vendor name.'),
			minLength(1),
			maxLength(200)
		)
	),
});

export type UpdateExpenseToolInput = InferOutput<
	typeof updateExpenseParameters
>;

export const deleteExpenseParameters = object({
	id: expenseIdParameter,
});
