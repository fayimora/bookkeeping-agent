import { ExpensesRepo } from '@bookeeping-agent/db';
import {
	CreateExpenseInput,
	ExpenseId,
	ExpensePage,
	type UserId,
} from '@bookeeping-agent/domain';
import { defineTool, type ToolDefinition } from '@flue/runtime';
import { Effect, Schema } from 'effect';

import { retryTransientRead, runToolEffect } from '../shared';
import {
	createExpenseParameters,
	defaultExpensePageSize,
	deleteExpenseParameters,
	getExpenseParameters,
	type ListExpensesToolInput,
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

export const listExpenseWorkflow = Effect.fn('AgentTools.listExpenses')(
	function* (userId: UserId, input: ListExpensesToolInput) {
		const filters = yield* resolveExpenseFilters(userId, input);
		const page = yield* Schema.decodeUnknownEffect(ExpensePage)({
			limit: input.limit ?? defaultExpensePageSize,
			offset: input.offset ?? 0,
		});
		const expensesRepo = yield* ExpensesRepo;
		const { expenses, hasMore } = yield* retryTransientRead(
			expensesRepo.listPage(userId, filters, page)
		);

		return {
			count: expenses.length,
			expenses,
			hasMore,
			...(hasMore && { nextOffset: page.offset + expenses.length }),
		};
	}
);

export function expenseTools(userId: UserId): ToolDefinition[] {
	const listExpensesTool = defineTool({
		description: `List individual expenses (newest first, ${defaultExpensePageSize} per page by default), filtered by date, category, or text. Narrow the filters or page with offset when hasMore is true. Use get_spending_breakdown for totals.`,
		input: listExpensesParameters,
		name: 'list_expenses',
		run: ({ data: input, signal }) =>
			runToolEffect(
				listExpenseWorkflow(userId, input).pipe(Effect.map(JSON.stringify)),
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
					const expenseId = yield* Schema.decodeUnknownEffect(ExpenseId)(
						input.id
					);
					const expenses = yield* ExpensesRepo;
					const expense = yield* retryTransientRead(
						expenses.getById(userId, expenseId)
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
					const categoryId = yield* resolveExpenseCategoryId(userId, input);
					const values = yield* Schema.decodeUnknownEffect(CreateExpenseInput)({
						...input,
						categoryId,
					});
					const expenses = yield* ExpensesRepo;
					const expense = yield* expenses.create(userId, values);
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
					const expenseId = yield* Schema.decodeUnknownEffect(ExpenseId)(
						input.id
					);
					const values = yield* buildUpdateExpenseValues(userId, input);
					const expenses = yield* ExpensesRepo;
					const expense = yield* expenses.update(userId, expenseId, values);
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
					const expenseId = yield* Schema.decodeUnknownEffect(ExpenseId)(
						input.id
					);
					const expenses = yield* ExpensesRepo;
					const expense = yield* expenses.delete(userId, expenseId);
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
