import { and, desc, eq, gte, ilike, lte, or, type SQL } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '..';
import { categories, expenses } from '../schema';

const expenseIdSchema = z.uuid();
const userIdSchema = z.string().min(1);
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

async function ensureCategoryBelongsToUser(userId: string, categoryId: string) {
	const [category] = await db
		.select({ id: categories.id })
		.from(categories)
		.where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
		.limit(1);

	if (!category) {
		throw new Error('Category does not belong to the authenticated user.');
	}
}

export async function listExpenses(
	userId: string,
	filters: ListExpensesFilters = {}
) {
	const parsedUserId = userIdSchema.parse(userId);
	const parsedFilters = listExpensesFiltersSchema.parse(filters);
	const conditions: SQL[] = [eq(expenses.userId, parsedUserId)];

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
		.where(and(...conditions))
		.orderBy(desc(expenses.date), desc(expenses.createdAt));
}

export async function getExpenseById(userId: string, id: string) {
	const parsedUserId = userIdSchema.parse(userId);
	const expenseId = expenseIdSchema.parse(id);
	const [expense] = await db
		.select()
		.from(expenses)
		.where(and(eq(expenses.id, expenseId), eq(expenses.userId, parsedUserId)))
		.limit(1);

	return expense ?? null;
}

export async function createExpense(userId: string, input: CreateExpenseInput) {
	const parsedUserId = userIdSchema.parse(userId);
	const values = createExpenseSchema.parse(input);

	if (values.categoryId) {
		await ensureCategoryBelongsToUser(parsedUserId, values.categoryId);
	}

	const [expense] = await db
		.insert(expenses)
		.values({
			...values,
			userId: parsedUserId,
		})
		.returning();

	return expense;
}

export async function updateExpense(
	userId: string,
	id: string,
	input: UpdateExpenseInput
) {
	const parsedUserId = userIdSchema.parse(userId);
	const expenseId = expenseIdSchema.parse(id);
	const values = updateExpenseSchema.parse(input);

	if (values.categoryId) {
		await ensureCategoryBelongsToUser(parsedUserId, values.categoryId);
	}

	const [expense] = await db
		.update(expenses)
		.set({
			...values,
			updatedAt: new Date(),
		})
		.where(and(eq(expenses.id, expenseId), eq(expenses.userId, parsedUserId)))
		.returning();

	return expense ?? null;
}

export async function deleteExpense(userId: string, id: string) {
	const parsedUserId = userIdSchema.parse(userId);
	const expenseId = expenseIdSchema.parse(id);
	const [expense] = await db
		.delete(expenses)
		.where(and(eq(expenses.id, expenseId), eq(expenses.userId, parsedUserId)))
		.returning();

	return expense ?? null;
}
