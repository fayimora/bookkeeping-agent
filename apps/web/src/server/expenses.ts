import { ExpensesRepo } from '@bookeeping-agent/db';
import { createServerFn } from '@tanstack/react-start';
import { Effect } from 'effect';

import { CurrentUser } from './auth';
import { runAuthenticatedEffect } from './http';
import { ExpenseValidators } from './validators';

export const listExpenses = createServerFn({ method: 'GET' })
	.validator(ExpenseValidators.list)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const expenses = yield* ExpensesRepo;
				const records = yield* expenses.list(currentUser.id, data ?? {});
				return Array.from(records);
			})
		)
	);

export const getExpenseById = createServerFn({ method: 'GET' })
	.validator(ExpenseValidators.id)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const expenses = yield* ExpensesRepo;
				return yield* expenses.getById(currentUser.id, data.id);
			})
		)
	);

export const createExpense = createServerFn({ method: 'POST' })
	.validator(ExpenseValidators.create)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const expenses = yield* ExpensesRepo;
				return yield* expenses.create(currentUser.id, data);
			})
		)
	);

export const updateExpense = createServerFn({ method: 'POST' })
	.validator(ExpenseValidators.update)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const expenses = yield* ExpensesRepo;
				return yield* expenses.update(currentUser.id, data.id, data.input);
			})
		)
	);

export const deleteExpense = createServerFn({ method: 'POST' })
	.validator(ExpenseValidators.id)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const expenses = yield* ExpensesRepo;
				return yield* expenses.delete(currentUser.id, data.id);
			})
		)
	);
