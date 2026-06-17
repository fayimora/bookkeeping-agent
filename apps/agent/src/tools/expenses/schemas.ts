import {
	boolean,
	description,
	type InferOutput,
	integer,
	maxLength,
	minLength,
	minValue,
	number,
	object,
	optional,
	pipe,
	regex,
	string,
} from 'valibot';

export const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const listExpensesParameters = object({
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
			regex(datePattern)
		)
	),
	to: optional(
		pipe(
			string(),
			description('End date in YYYY-MM-DD format.'),
			regex(datePattern)
		)
	),
	search: optional(
		pipe(
			string(),
			description('Search text for vendor or description.'),
			minLength(1)
		)
	),
});

export type ListExpensesToolInput = InferOutput<typeof listExpensesParameters>;

const expenseIdParameter = pipe(
	string(),
	description('Expense UUID.'),
	minLength(1)
);

export const getExpenseParameters = object({
	id: expenseIdParameter,
});

export type GetExpenseToolInput = InferOutput<typeof getExpenseParameters>;

export const createExpenseParameters = object({
	vendor: pipe(
		string(),
		description('Merchant or vendor name.'),
		minLength(1),
		maxLength(200)
	),
	date: pipe(
		string(),
		description('Expense date in YYYY-MM-DD format.'),
		regex(datePattern)
	),
	amountCents: pipe(
		number(),
		description('Amount in minor units, for example £12.50 is 1250.'),
		integer(),
		minValue(1)
	),
	currency: optional(
		pipe(
			string(),
			description('Three-letter currency code. Defaults to GBP.'),
			minLength(3),
			maxLength(3)
		)
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
	description: optional(
		pipe(
			string(),
			description('Short optional note or description.'),
			minLength(1)
		)
	),
});

export type CreateExpenseToolInput = InferOutput<
	typeof createExpenseParameters
>;

export const updateExpenseParameters = object({
	id: expenseIdParameter,
	vendor: optional(
		pipe(
			string(),
			description('Updated merchant or vendor name.'),
			minLength(1),
			maxLength(200)
		)
	),
	date: optional(
		pipe(
			string(),
			description('Updated expense date in YYYY-MM-DD format.'),
			regex(datePattern)
		)
	),
	amountCents: optional(
		pipe(
			number(),
			description('Updated amount in minor units, for example £12.50 is 1250.'),
			integer(),
			minValue(1)
		)
	),
	currency: optional(
		pipe(
			string(),
			description('Updated three-letter currency code.'),
			minLength(3),
			maxLength(3)
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
	description: optional(
		pipe(
			string(),
			description('Updated short optional note or description.'),
			minLength(1)
		)
	),
	clearDescription: optional(
		pipe(boolean(), description('Set true to remove the expense description.'))
	),
});

export type UpdateExpenseToolInput = InferOutput<
	typeof updateExpenseParameters
>;

export const deleteExpenseParameters = object({
	id: expenseIdParameter,
});

export type DeleteExpenseToolInput = InferOutput<
	typeof deleteExpenseParameters
>;
