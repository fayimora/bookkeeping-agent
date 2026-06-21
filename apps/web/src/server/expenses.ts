import { parseResult } from '@bookeeping-agent/db/errors';
import {
	createExpense as createExpenseRecord,
	createExpenseSchema,
	deleteExpense as deleteExpenseRecord,
	getExpenseById as getExpenseRecordById,
	listExpenses as listExpenseRecords,
	listExpensesFiltersSchema,
	updateExpense as updateExpenseRecord,
	updateExpenseSchema,
} from '@bookeeping-agent/db/queries/expenses';
import { createServerFn } from '@tanstack/react-start';
import { Result } from 'better-result';
import { z } from 'zod';

import { getSessionResult, serializeResult } from './result';

const expenseIdInputSchema = z.object({
	id: z.uuid(),
});

const updateExpenseInputSchema = z.object({
	id: z.uuid(),
	input: updateExpenseSchema,
});

export const listExpenses = createServerFn({ method: 'GET' })
	.validator((data: unknown) => data)
	.handler(async ({ data }) =>
		serializeResult(
			await Result.gen(async function* () {
				const filters = yield* parseResult(() =>
					listExpensesFiltersSchema.optional().parse(data)
				);
				const session = yield* Result.await(getSessionResult());

				return await listExpenseRecords(session.user.id, filters ?? {});
			})
		)
	);

export const getExpenseById = createServerFn({ method: 'GET' })
	.validator((data: unknown) => data)
	.handler(async ({ data }) =>
		serializeResult(
			await Result.gen(async function* () {
				const input = yield* parseResult(() =>
					expenseIdInputSchema.parse(data)
				);
				const session = yield* Result.await(getSessionResult());

				return await getExpenseRecordById(session.user.id, input.id);
			})
		)
	);

export const createExpense = createServerFn({ method: 'POST' })
	.validator((data: unknown) => data)
	.handler(async ({ data }) =>
		serializeResult(
			await Result.gen(async function* () {
				const input = yield* parseResult(() => createExpenseSchema.parse(data));
				const session = yield* Result.await(getSessionResult());

				return await createExpenseRecord(session.user.id, input);
			})
		)
	);

export const updateExpense = createServerFn({ method: 'POST' })
	.validator((data: unknown) => data)
	.handler(async ({ data }) =>
		serializeResult(
			await Result.gen(async function* () {
				const input = yield* parseResult(() =>
					updateExpenseInputSchema.parse(data)
				);
				const session = yield* Result.await(getSessionResult());

				return await updateExpenseRecord(
					session.user.id,
					input.id,
					input.input
				);
			})
		)
	);

export const deleteExpense = createServerFn({ method: 'POST' })
	.validator((data: unknown) => data)
	.handler(async ({ data }) =>
		serializeResult(
			await Result.gen(async function* () {
				const input = yield* parseResult(() =>
					expenseIdInputSchema.parse(data)
				);
				const session = yield* Result.await(getSessionResult());

				return await deleteExpenseRecord(session.user.id, input.id);
			})
		)
	);
