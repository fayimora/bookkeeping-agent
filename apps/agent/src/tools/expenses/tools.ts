import {
	createExpense,
	deleteExpense,
	getExpenseById,
	listExpenses,
	updateExpense,
} from '@bookeeping-agent/db/queries/expenses';
import { defineTool, type ToolDefinition } from '@flue/runtime';

import {
	type CreateExpenseToolInput,
	createExpenseParameters,
	type DeleteExpenseToolInput,
	deleteExpenseParameters,
	type GetExpenseToolInput,
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

const listExpensesTool = defineTool({
	name: 'list_expenses',
	description:
		'List saved expenses, optionally filtered by date range, category, or text search.',
	parameters: listExpensesParameters,
	execute: async (input) => {
		const filters = await resolveExpenseFilters(input);
		const expenses = await listExpenses(filters);

		return JSON.stringify({ count: expenses.length, expenses });
	},
});

const getExpenseTool = defineTool({
	name: 'get_expense',
	description: 'Get one saved expense by id.',
	parameters: getExpenseParameters,
	execute: async (input: GetExpenseToolInput) => {
		const expense = await getExpenseById(input.id);

		if (!expense) {
			throw new Error('Expense not found.');
		}

		return JSON.stringify({ expense });
	},
});

const getSpendingTotalTool = defineTool({
	name: 'get_spending_total',
	description:
		'Calculate spending totals from saved expenses, optionally filtered by date range, category, or text search.',
	parameters: listExpensesParameters,
	execute: async (input) => {
		const filters = await resolveExpenseFilters(input);
		const expenses = await listExpenses(filters);
		const totalsByCurrency = expenses.reduce<Record<string, number>>(
			(totals, expense) => {
				totals[expense.currency] =
					(totals[expense.currency] ?? 0) + expense.amountCents;
				return totals;
			},
			{}
		);

		const totals = Object.entries(totalsByCurrency).map(
			([currency, amountCents]) => ({
				currency,
				amountCents,
				formatted: formatMoney(amountCents, currency),
			})
		);

		return JSON.stringify({ count: expenses.length, totals, filters });
	},
});

const createExpenseTool = defineTool({
	name: 'create_expense',
	description:
		'Create a saved expense after the vendor, date, amount, currency, and category are clear. Amount must be in minor units, such as pence or cents.',
	parameters: createExpenseParameters,
	execute: async (input: CreateExpenseToolInput) => {
		const categoryId = await resolveExpenseCategoryId(input);

		const expense = await createExpense({
			vendor: input.vendor.trim(),
			date: input.date,
			amountCents: input.amountCents,
			currency: input.currency?.trim().toUpperCase() ?? 'GBP',
			categoryId,
			description: input.description?.trim(),
		});

		return JSON.stringify({ expense });
	},
});

const updateExpenseTool = defineTool({
	name: 'update_expense',
	description:
		'Update a saved expense by id after the requested field changes are clear. Amount must be in minor units, such as pence or cents.',
	parameters: updateExpenseParameters,
	execute: async (input: UpdateExpenseToolInput) => {
		const values: {
			amountCents?: number;
			categoryId?: null | string;
			currency?: string;
			date?: string;
			description?: null | string;
			vendor?: string;
		} = {};

		if (input.vendor !== undefined) {
			values.vendor = input.vendor.trim();
		}

		if (input.date !== undefined) {
			values.date = input.date;
		}

		if (input.amountCents !== undefined) {
			values.amountCents = input.amountCents;
		}

		if (input.currency !== undefined) {
			values.currency = input.currency.trim().toUpperCase();
		}

		if (
			input.clearCategory &&
			(input.categoryId !== undefined || input.categorySlug !== undefined)
		) {
			throw new Error('Use clearCategory or a category value, not both.');
		}

		if (input.clearCategory) {
			values.categoryId = null;
		} else if (input.categoryId !== undefined) {
			values.categoryId = input.categoryId;
		} else if (input.categorySlug !== undefined) {
			values.categoryId = await resolveExpenseCategoryId(input);
		}

		if (input.clearDescription && input.description !== undefined) {
			throw new Error('Use clearDescription or description, not both.');
		}

		if (input.clearDescription) {
			values.description = null;
		} else if (input.description !== undefined) {
			values.description = input.description.trim();
		}

		if (Object.keys(values).length === 0) {
			throw new Error('Provide at least one expense field to update.');
		}

		const expense = await updateExpense(input.id, values);

		if (!expense) {
			throw new Error('Expense not found.');
		}

		return JSON.stringify({ expense });
	},
});

const deleteExpenseTool = defineTool({
	name: 'delete_expense',
	description: 'Delete a saved expense by id only after user confirmation.',
	parameters: deleteExpenseParameters,
	execute: async (input: DeleteExpenseToolInput) => {
		const expense = await deleteExpense(input.id);

		if (!expense) {
			throw new Error('Expense not found.');
		}

		return JSON.stringify({ deletedExpense: expense });
	},
});

export const expenseTools: ToolDefinition[] = [
	listExpensesTool,
	getExpenseTool,
	getSpendingTotalTool,
	createExpenseTool,
	updateExpenseTool,
	deleteExpenseTool,
];
