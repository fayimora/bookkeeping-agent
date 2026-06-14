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
import { z } from 'zod';

const expenseIdInputSchema = z.object({
	id: z.uuid(),
});

const updateExpenseInputSchema = z.object({
	id: z.uuid(),
	input: updateExpenseSchema,
});

export const listExpenses = createServerFn({ method: 'GET' })
	.validator((data: unknown) =>
		listExpensesFiltersSchema.optional().parse(data)
	)
	.handler(async ({ data }) => await listExpenseRecords(data ?? {}));

export const getExpenseById = createServerFn({ method: 'GET' })
	.validator((data: unknown) => expenseIdInputSchema.parse(data))
	.handler(async ({ data }) => await getExpenseRecordById(data.id));

export const createExpense = createServerFn({ method: 'POST' })
	.validator((data: unknown) => createExpenseSchema.parse(data))
	.handler(async ({ data }) => await createExpenseRecord(data));

export const updateExpense = createServerFn({ method: 'POST' })
	.validator((data: unknown) => updateExpenseInputSchema.parse(data))
	.handler(async ({ data }) => await updateExpenseRecord(data.id, data.input));

export const deleteExpense = createServerFn({ method: 'POST' })
	.validator((data: unknown) => expenseIdInputSchema.parse(data))
	.handler(async ({ data }) => await deleteExpenseRecord(data.id));
