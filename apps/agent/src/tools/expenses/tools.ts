import {
	createExpense,
	deleteExpense,
	getExpenseById,
	listExpenses,
	updateExpense,
} from '@bookeeping-agent/db/queries/expenses';
import { defineTool, type ToolDefinition } from '@flue/runtime';

import {
	createExpenseParameters,
	deleteExpenseParameters,
	getExpenseParameters,
	listExpensesParameters,
	type UpdateExpenseToolInput,
	updateExpenseParameters,
} from './schemas.ts';
import {
	formatMoney,
	resolveExpenseCategoryId,
	resolveExpenseFilters,
} from './utils.ts';

interface UpdateExpenseValues {
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

async function getCategoryUpdate(
	userId: string,
	input: UpdateExpenseToolInput
): Promise<Pick<UpdateExpenseValues, 'categoryId'>> {
	if (
		input.clearCategory &&
		(input.categoryId !== undefined || input.categorySlug !== undefined)
	) {
		throw new Error('Use clearCategory or a category value, not both.');
	}

	if (input.clearCategory) {
		return { categoryId: null };
	}

	if (hasValue(input.categoryId)) {
		return { categoryId: input.categoryId };
	}

	if (hasValue(input.categorySlug)) {
		return { categoryId: await resolveExpenseCategoryId(userId, input) };
	}

	return {};
}

function getDescriptionUpdate(
	input: UpdateExpenseToolInput
): Pick<UpdateExpenseValues, 'description'> {
	if (input.clearDescription && input.description !== undefined) {
		throw new Error('Use clearDescription or description, not both.');
	}

	if (input.clearDescription) {
		return { description: null };
	}

	if (hasValue(input.description)) {
		return { description: input.description.trim() };
	}

	return {};
}

async function buildUpdateExpenseValues(
	userId: string,
	input: UpdateExpenseToolInput
) {
	const values: UpdateExpenseValues = {};

	if (hasValue(input.vendor)) {
		values.vendor = input.vendor.trim();
	}

	if (hasValue(input.date)) {
		values.date = input.date;
	}

	if (hasValue(input.amountCents)) {
		values.amountCents = input.amountCents;
	}

	if (hasValue(input.currency)) {
		values.currency = input.currency.trim().toUpperCase();
	}

	Object.assign(
		values,
		await getCategoryUpdate(userId, input),
		getDescriptionUpdate(input)
	);

	if (Object.keys(values).length === 0) {
		throw new Error('Provide at least one expense field to update.');
	}

	return values;
}

export function expenseTools(userId: string): ToolDefinition[] {
	const listExpensesTool = defineTool({
		description:
			'List saved expenses, optionally filtered by date range, category, or text search.',
		input: listExpensesParameters,
		name: 'list_expenses',
		run: async ({ input }) => {
			const filters = await resolveExpenseFilters(userId, input);
			const expenses = await listExpenses(userId, filters);

			return JSON.stringify({ count: expenses.length, expenses });
		},
	});

	const getExpenseTool = defineTool({
		description: 'Get one saved expense by id.',
		input: getExpenseParameters,
		name: 'get_expense',
		run: async ({ input }) => {
			const expense = await getExpenseById(userId, input.id);

			if (!expense) {
				throw new Error('Expense not found.');
			}

			return JSON.stringify({ expense });
		},
	});

	const getSpendingTotalTool = defineTool({
		description:
			'Calculate spending totals from saved expenses, optionally filtered by date range, category, or text search.',
		input: listExpensesParameters,
		name: 'get_spending_total',
		run: async ({ input }) => {
			const filters = await resolveExpenseFilters(userId, input);
			const expenses = await listExpenses(userId, filters);
			const totalsByCurrency = expenses.reduce<Record<string, number>>(
				(totalsByCurrencyAccumulator, expense) => {
					totalsByCurrencyAccumulator[expense.currency] =
						(totalsByCurrencyAccumulator[expense.currency] ?? 0) +
						expense.amountCents;
					return totalsByCurrencyAccumulator;
				},
				{}
			);

			const totals = Object.entries(totalsByCurrency).map(
				([currency, amountCents]) => ({
					amountCents,
					currency,
					formatted: formatMoney(amountCents, currency),
				})
			);

			return JSON.stringify({ count: expenses.length, filters, totals });
		},
	});

	const createExpenseTool = defineTool({
		description:
			'Create a saved expense after the vendor, date, amount, currency, and category are clear. Amount must be in minor units, such as pence or cents.',
		input: createExpenseParameters,
		name: 'create_expense',
		run: async ({ input }) => {
			const categoryId = await resolveExpenseCategoryId(userId, input);

			const expense = await createExpense(userId, {
				amountCents: input.amountCents,
				categoryId,
				currency: input.currency?.trim().toUpperCase() ?? 'GBP',
				date: input.date,
				description: input.description?.trim(),
				vendor: input.vendor.trim(),
			});

			return JSON.stringify({ expense });
		},
	});

	const updateExpenseTool = defineTool({
		description:
			'Update a saved expense by id after the requested field changes are clear. Amount must be in minor units, such as pence or cents.',
		input: updateExpenseParameters,
		name: 'update_expense',
		run: async ({ input }) => {
			const values = await buildUpdateExpenseValues(userId, input);
			const expense = await updateExpense(userId, input.id, values);

			if (!expense) {
				throw new Error('Expense not found.');
			}

			return JSON.stringify({ expense });
		},
	});

	const deleteExpenseTool = defineTool({
		description: 'Delete a saved expense by id only after user confirmation.',
		input: deleteExpenseParameters,
		name: 'delete_expense',
		run: async ({ input }) => {
			const expense = await deleteExpense(userId, input.id);

			if (!expense) {
				throw new Error('Expense not found.');
			}

			return JSON.stringify({ deletedExpense: expense });
		},
	});

	return [
		listExpensesTool,
		getExpenseTool,
		getSpendingTotalTool,
		createExpenseTool,
		updateExpenseTool,
		deleteExpenseTool,
	];
}
