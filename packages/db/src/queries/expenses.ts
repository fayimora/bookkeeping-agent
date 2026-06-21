import { Result } from 'better-result';
import { and, desc, eq, gte, ilike, lte, or, type SQL } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '..';
import {
	CategoryOwnershipError,
	dbResult,
	NotFoundError,
	parseResult,
} from '../errors';
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

function ensureCategoryBelongsToUser(userId: string, categoryId: string) {
	return Result.gen(async function* () {
		const category = yield* Result.await(
			dbResult(async () => {
				const [row] = await db
					.select({ id: categories.id })
					.from(categories)
					.where(
						and(eq(categories.id, categoryId), eq(categories.userId, userId))
					)
					.limit(1);

				return row ?? null;
			})
		);

		return category
			? Result.ok()
			: Result.err(
					new CategoryOwnershipError({
						message: 'Category does not belong to the authenticated user.',
					})
				);
	});
}

export function listExpenses(
	userId: string,
	filters: ListExpensesFilters = {}
) {
	return Result.gen(async function* () {
		const parsedUserId = yield* parseResult(() => userIdSchema.parse(userId));
		const parsedFilters = yield* parseResult(() =>
			listExpensesFiltersSchema.parse(filters)
		);

		const rows = yield* Result.await(
			dbResult(async () => {
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
			})
		);

		return Result.ok(rows);
	});
}

export function getExpenseById(userId: string, id: string) {
	return Result.gen(async function* () {
		const parsedUserId = yield* parseResult(() => userIdSchema.parse(userId));
		const expenseId = yield* parseResult(() => expenseIdSchema.parse(id));

		const expense = yield* Result.await(
			dbResult(async () => {
				const [row] = await db
					.select()
					.from(expenses)
					.where(
						and(eq(expenses.id, expenseId), eq(expenses.userId, parsedUserId))
					)
					.limit(1);

				return row ?? null;
			})
		);

		return Result.ok(expense);
	});
}

export function createExpense(userId: string, input: CreateExpenseInput) {
	return Result.gen(async function* () {
		const parsedUserId = yield* parseResult(() => userIdSchema.parse(userId));
		const values = yield* parseResult(() => createExpenseSchema.parse(input));

		if (values.categoryId) {
			yield* Result.await(
				ensureCategoryBelongsToUser(parsedUserId, values.categoryId)
			);
		}

		const expense = yield* Result.await(
			dbResult(async () => {
				const [row] = await db
					.insert(expenses)
					.values({ ...values, userId: parsedUserId })
					.returning();

				return row ?? null;
			})
		);

		return expense
			? Result.ok(expense)
			: Result.err(
					new NotFoundError({
						message: 'Expense was not created.',
						resource: 'expense',
					})
				);
	});
}

export function updateExpense(
	userId: string,
	id: string,
	input: UpdateExpenseInput
) {
	return Result.gen(async function* () {
		const parsedUserId = yield* parseResult(() => userIdSchema.parse(userId));
		const expenseId = yield* parseResult(() => expenseIdSchema.parse(id));
		const values = yield* parseResult(() => updateExpenseSchema.parse(input));

		if (values.categoryId) {
			yield* Result.await(
				ensureCategoryBelongsToUser(parsedUserId, values.categoryId)
			);
		}

		const expense = yield* Result.await(
			dbResult(async () => {
				const [row] = await db
					.update(expenses)
					.set({ ...values, updatedAt: new Date() })
					.where(
						and(eq(expenses.id, expenseId), eq(expenses.userId, parsedUserId))
					)
					.returning();

				return row ?? null;
			})
		);

		return expense
			? Result.ok(expense)
			: Result.err(
					new NotFoundError({
						message: 'Expense not found.',
						resource: 'expense',
					})
				);
	});
}

export function deleteExpense(userId: string, id: string) {
	return Result.gen(async function* () {
		const parsedUserId = yield* parseResult(() => userIdSchema.parse(userId));
		const expenseId = yield* parseResult(() => expenseIdSchema.parse(id));

		const expense = yield* Result.await(
			dbResult(async () => {
				const [row] = await db
					.delete(expenses)
					.where(
						and(eq(expenses.id, expenseId), eq(expenses.userId, parsedUserId))
					)
					.returning();

				return row ?? null;
			})
		);

		return expense
			? Result.ok(expense)
			: Result.err(
					new NotFoundError({
						message: 'Expense not found.',
						resource: 'expense',
					})
				);
	});
}
