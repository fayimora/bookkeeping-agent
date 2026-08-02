import { ExpensesRepo } from '@bookeeping-agent/db';
import {
	CreateExpenseInput,
	ExpenseId,
	UserId,
} from '@bookeeping-agent/domain';
import { defineTool, type ToolDefinition } from '@flue/runtime';
import { Effect, Schema } from 'effect';

import { retryTransientRead, runToolEffect } from '../shared';
import {
	createExpenseParameters,
	deleteExpenseParameters,
	getExpenseParameters,
	listExpensesParameters,
	spendingBreakdownParameters,
	updateExpenseParameters,
} from './schemas';
import { spendingBreakdownWorkflow } from './spending';
import {
	buildUpdateExpenseValues,
	resolveExpenseCategoryId,
	resolveExpenseFilters,
} from './utils';

const listExpenseWorkflow = Effect.fn('AgentTools.listExpenses')(function* (
	userIdValue: string,
	input: Parameters<typeof resolveExpenseFilters>[1]
) {
	const userId = yield* Schema.decodeUnknownEffect(UserId)(userIdValue);
	const filters = yield* resolveExpenseFilters(userId, input);
	const expenses = yield* ExpensesRepo;
	const listed = yield* retryTransientRead(expenses.list(userId, filters));
	return { expenses: listed, filters };
});

export function expenseTools(userId: string): ToolDefinition[] {
	const listExpensesTool = defineTool({
		description:
			'List expenses, optionally filtered by date, category, or text.',
		input: listExpensesParameters,
		name: 'list_expenses',
		run: ({ data: input, signal }) =>
			runToolEffect(
				listExpenseWorkflow(userId, input).pipe(
					Effect.map(({ expenses }) =>
						JSON.stringify({ count: expenses.length, expenses })
					)
				),
				signal
			),
	});

	const getExpenseTool = defineTool({
		description: 'Get one saved expense by id.',
		input: getExpenseParameters,
		name: 'get_expense',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const parsedUserId =
						yield* Schema.decodeUnknownEffect(UserId)(userId);
					const expenseId = yield* Schema.decodeUnknownEffect(ExpenseId)(
						input.id
					);
					const expenses = yield* ExpensesRepo;
					const expense = yield* retryTransientRead(
						expenses.getById(parsedUserId, expenseId)
					);
					return JSON.stringify({ expense });
				}),
				signal
			),
	});

	const getSpendingBreakdownTool = defineTool({
		description:
			'Calculate spending grouped by total, month, category, or month and category, with optional filters.',
		input: spendingBreakdownParameters,
		name: 'get_spending_breakdown',
		run: ({ data: input, signal }) =>
			runToolEffect(
				spendingBreakdownWorkflow(userId, input).pipe(
					Effect.map((output) => ({ output }))
				),
				signal
			),
	});

	const createExpenseTool = defineTool({
		description:
			'Create an expense when vendor, date, amount, currency, and category are clear. Amount is in minor units.',
		input: createExpenseParameters,
		name: 'create_expense',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const parsedUserId =
						yield* Schema.decodeUnknownEffect(UserId)(userId);
					const categoryId = yield* resolveExpenseCategoryId(
						parsedUserId,
						input
					);
					const values = yield* Schema.decodeUnknownEffect(CreateExpenseInput)({
						...input,
						categoryId,
					});
					const expenses = yield* ExpensesRepo;
					const expense = yield* expenses.create(parsedUserId, values);
					return JSON.stringify({ expense });
				}),
				signal
			),
	});

	const updateExpenseTool = defineTool({
		description:
			'Update an expense by id when requested changes are clear. Amount is in minor units.',
		input: updateExpenseParameters,
		name: 'update_expense',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const parsedUserId =
						yield* Schema.decodeUnknownEffect(UserId)(userId);
					const expenseId = yield* Schema.decodeUnknownEffect(ExpenseId)(
						input.id
					);
					const values = yield* buildUpdateExpenseValues(parsedUserId, input);
					const expenses = yield* ExpensesRepo;
					const expense = yield* expenses.update(
						parsedUserId,
						expenseId,
						values
					);
					return JSON.stringify({ expense });
				}),
				signal
			),
	});

	const deleteExpenseTool = defineTool({
		description: 'Delete a saved expense by id only after user confirmation.',
		input: deleteExpenseParameters,
		name: 'delete_expense',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const parsedUserId =
						yield* Schema.decodeUnknownEffect(UserId)(userId);
					const expenseId = yield* Schema.decodeUnknownEffect(ExpenseId)(
						input.id
					);
					const expenses = yield* ExpensesRepo;
					const expense = yield* expenses.delete(parsedUserId, expenseId);
					return JSON.stringify({ deletedExpense: expense });
				}),
				signal
			),
	});

	return [
		listExpensesTool,
		getExpenseTool,
		getSpendingBreakdownTool,
		createExpenseTool,
		updateExpenseTool,
		deleteExpenseTool,
	];
}
