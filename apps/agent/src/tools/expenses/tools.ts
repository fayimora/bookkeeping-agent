import {
	createExpense,
	listExpenses,
} from '@bookeeping-agent/db/queries/expenses';
import { defineTool, type ToolDefinition } from '@flue/runtime';
import { Parse } from 'typebox/value';

import {
	type CreateExpenseToolInput,
	createExpenseParameters,
	listExpensesParameters,
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
	execute: async (args) => {
		const input = Parse(listExpensesParameters, args);
		const filters = await resolveExpenseFilters(input);
		const expenses = await listExpenses(filters);

		return JSON.stringify({ count: expenses.length, expenses });
	},
});

const getSpendingTotalTool = defineTool({
	name: 'get_spending_total',
	description:
		'Calculate spending totals from saved expenses, optionally filtered by date range, category, or text search.',
	parameters: listExpensesParameters,
	execute: async (args) => {
		const input = Parse(listExpensesParameters, args);
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
	execute: async (args) => {
		const input: CreateExpenseToolInput = Parse(createExpenseParameters, args);
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

export const expenseTools: ToolDefinition[] = [
	listExpensesTool,
	getSpendingTotalTool,
	createExpenseTool,
];
