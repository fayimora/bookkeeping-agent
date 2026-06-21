import { NotFoundError } from '@bookeeping-agent/db/errors';
import {
	createExpense,
	deleteExpense,
	getExpenseById,
	listExpenses,
	updateExpense,
} from '@bookeeping-agent/db/queries/expenses';
import { defineTool, type ToolDefinition } from '@flue/runtime';
import { Result } from 'better-result';

import { ToolInputError, throwToolError, unwrapToolResult } from '../result.ts';
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

function getCategoryUpdate(userId: string, input: UpdateExpenseToolInput) {
	return Result.gen(async function* () {
		if (
			input.clearCategory &&
			(input.categoryId !== undefined || input.categorySlug !== undefined)
		) {
			return Result.err(
				new ToolInputError({
					message: 'Use clearCategory or a category value, not both.',
				})
			);
		}

		const update: Pick<UpdateExpenseValues, 'categoryId'> = {};

		if (input.clearCategory) {
			update.categoryId = null;
		} else if (hasValue(input.categoryId)) {
			update.categoryId = input.categoryId;
		} else if (hasValue(input.categorySlug)) {
			update.categoryId = yield* Result.await(
				resolveExpenseCategoryId(userId, input)
			);
		}

		return Result.ok(update);
	});
}

function getDescriptionUpdate(input: UpdateExpenseToolInput) {
	if (input.clearDescription && input.description !== undefined) {
		return Result.err(
			new ToolInputError({
				message: 'Use clearDescription or description, not both.',
			})
		);
	}

	const update: Pick<UpdateExpenseValues, 'description'> = {};

	if (input.clearDescription) {
		update.description = null;
	} else if (hasValue(input.description)) {
		update.description = input.description.trim();
	}

	return Result.ok(update);
}

function buildUpdateExpenseValues(
	userId: string,
	input: UpdateExpenseToolInput
) {
	return Result.gen(async function* () {
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

		const categoryUpdate = yield* Result.await(
			getCategoryUpdate(userId, input)
		);
		const descriptionUpdate = yield* getDescriptionUpdate(input);

		Object.assign(values, categoryUpdate, descriptionUpdate);

		if (Object.keys(values).length === 0) {
			return Result.err(
				new ToolInputError({
					message: 'Provide at least one expense field to update.',
				})
			);
		}

		return Result.ok(values);
	});
}

export function expenseTools(userId: string): ToolDefinition[] {
	const listExpensesTool = defineTool({
		name: 'list_expenses',
		description:
			'List saved expenses, optionally filtered by date range, category, or text search.',
		parameters: listExpensesParameters,
		execute: async (input) => {
			const filters = unwrapToolResult(
				await resolveExpenseFilters(userId, input)
			);
			const expenses = unwrapToolResult(await listExpenses(userId, filters));

			return JSON.stringify({ count: expenses.length, expenses });
		},
	});

	const getExpenseTool = defineTool({
		name: 'get_expense',
		description: 'Get one saved expense by id.',
		parameters: getExpenseParameters,
		execute: async (input: GetExpenseToolInput) => {
			const expense = unwrapToolResult(await getExpenseById(userId, input.id));

			if (!expense) {
				throwToolError(
					new NotFoundError({
						message: 'Expense not found.',
						resource: 'expense',
					})
				);
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
			const filters = unwrapToolResult(
				await resolveExpenseFilters(userId, input)
			);
			const expenses = unwrapToolResult(await listExpenses(userId, filters));
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
			const categoryId = unwrapToolResult(
				await resolveExpenseCategoryId(userId, input)
			);

			const expense = unwrapToolResult(
				await createExpense(userId, {
					vendor: input.vendor.trim(),
					date: input.date,
					amountCents: input.amountCents,
					currency: input.currency?.trim().toUpperCase() ?? 'GBP',
					categoryId,
					description: input.description?.trim(),
				})
			);

			return JSON.stringify({ expense });
		},
	});

	const updateExpenseTool = defineTool({
		name: 'update_expense',
		description:
			'Update a saved expense by id after the requested field changes are clear. Amount must be in minor units, such as pence or cents.',
		parameters: updateExpenseParameters,
		execute: async (input: UpdateExpenseToolInput) => {
			const values = unwrapToolResult(
				await buildUpdateExpenseValues(userId, input)
			);
			const expense = unwrapToolResult(
				await updateExpense(userId, input.id, values)
			);

			return JSON.stringify({ expense });
		},
	});

	const deleteExpenseTool = defineTool({
		name: 'delete_expense',
		description: 'Delete a saved expense by id only after user confirmation.',
		parameters: deleteExpenseParameters,
		execute: async (input: DeleteExpenseToolInput) => {
			const expense = unwrapToolResult(await deleteExpense(userId, input.id));

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
