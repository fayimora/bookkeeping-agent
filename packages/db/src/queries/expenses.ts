import { and, desc, eq, gte, ilike, lte, or, type SQL } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '..';
import { expenses } from '../schema';

const expenseIdSchema = z.uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const currencySchema = z
	.string()
	.trim()
	.length(3)
	.transform((value) => value.toUpperCase());

export const createExpenseSchema = z.object({
	vendor: z.string().trim().min(1).max(200),
	date: dateSchema,
	amountCents: z.number().int().positive(),
	currency: currencySchema.default('GBP'),
	categoryId: z.uuid().nullable().optional(),
	description: z.string().trim().min(1).nullable().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const listExpensesFiltersSchema = z.object({
	categoryId: z.uuid().optional(),
	from: dateSchema.optional(),
	to: dateSchema.optional(),
	search: z.string().trim().min(1).optional(),
});

export type CreateExpenseInput = z.input<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.input<typeof updateExpenseSchema>;
export type ListExpensesFilters = z.input<typeof listExpensesFiltersSchema>;

export async function listExpenses(filters: ListExpensesFilters = {}) {
	const parsedFilters = listExpensesFiltersSchema.parse(filters);
	const conditions: SQL[] = [];

	if (parsedFilters.categoryId) {
		conditions.push(eq(expenses.categoryId, parsedFilters.categoryId));
	}

	if (parsedFilters.from) {
		conditions.push(gte(expenses.date, parsedFilters.from));
	}

	if (parsedFilters.to) {
		conditions.push(lte(expenses.date, parsedFilters.to));
	}

	if (parsedFilters.search) {
		const searchPattern = `%${parsedFilters.search}%`;
		const searchCondition = or(
			ilike(expenses.vendor, searchPattern),
			ilike(expenses.description, searchPattern)
		);

		if (searchCondition) {
			conditions.push(searchCondition);
		}
	}

	return await db
		.select()
		.from(expenses)
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(desc(expenses.date), desc(expenses.createdAt));
}

export async function getExpenseById(id: string) {
	const expenseId = expenseIdSchema.parse(id);
	const [expense] = await db
		.select()
		.from(expenses)
		.where(eq(expenses.id, expenseId))
		.limit(1);

	return expense ?? null;
}

export async function createExpense(input: CreateExpenseInput) {
	const values = createExpenseSchema.parse(input);
	const [expense] = await db.insert(expenses).values(values).returning();

	return expense;
}

export async function updateExpense(id: string, input: UpdateExpenseInput) {
	const expenseId = expenseIdSchema.parse(id);
	const values = updateExpenseSchema.parse(input);
	const [expense] = await db
		.update(expenses)
		.set({
			...values,
			updatedAt: new Date(),
		})
		.where(eq(expenses.id, expenseId))
		.returning();

	return expense ?? null;
}

export async function deleteExpense(id: string) {
	const expenseId = expenseIdSchema.parse(id);
	const [expense] = await db
		.delete(expenses)
		.where(eq(expenses.id, expenseId))
		.returning();

	return expense ?? null;
}
