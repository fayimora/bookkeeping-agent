import {
	CreateExpenseInput as DomainCreateExpenseInput,
	ListExpensesFilters as DomainListExpensesFilters,
	UpdateExpenseInput as DomainUpdateExpenseInput,
	ExpenseId,
	UserId,
} from '@bookeeping-agent/domain';
import { Effect, Schema } from 'effect';
import { z } from 'zod';

import { ExpensesRepo } from '#db/repositories';
import { repositoryRuntime } from '#db/runtime';

// Temporary framework compatibility schemas. Removed when the web server moves
// to the domain package's Standard Schema adapters in Chunk 4.
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const currencySchema = z
	.string()
	.trim()
	.length(3)
	.transform((value) => value.toUpperCase());

export const createExpenseSchema = z.object({
	amountCents: z.number().int().positive(),
	categoryId: z.uuid().nullable().optional(),
	currency: currencySchema.default('GBP'),
	date: dateSchema,
	description: z.string().trim().min(1).nullable().optional(),
	vendor: z.string().trim().min(1).max(200),
});
export const updateExpenseSchema = createExpenseSchema.partial();
export const listExpensesFiltersSchema = z.object({
	categoryId: z.uuid().optional(),
	from: dateSchema.optional(),
	search: z.string().trim().min(1).optional(),
	to: dateSchema.optional(),
});

export type CreateExpenseInput = z.input<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.input<typeof updateExpenseSchema>;
export type ListExpensesFilters = z.input<typeof listExpensesFiltersSchema>;

export function listExpenses(
	userId: string,
	filters: ListExpensesFilters = {}
) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const parsedFilters = yield* Schema.decodeUnknownEffect(
				DomainListExpensesFilters
			)(filters);
			const repo = yield* ExpensesRepo;
			const expenses = yield* repo.list(parsedUserId, parsedFilters);
			return Array.from(expenses);
		})
	);
}

export function getExpenseById(userId: string, id: string) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const expenseId = yield* Schema.decodeUnknownEffect(ExpenseId)(id);
			const repo = yield* ExpensesRepo;
			return yield* repo
				.getById(parsedUserId, expenseId)
				.pipe(Effect.catchTag('ExpenseNotFound', () => Effect.succeed(null)));
		})
	);
}

export function createExpense(userId: string, input: CreateExpenseInput) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const values = yield* Schema.decodeUnknownEffect(
				DomainCreateExpenseInput
			)(input);
			const repo = yield* ExpensesRepo;
			return yield* repo.create(parsedUserId, values);
		})
	);
}

export function updateExpense(
	userId: string,
	id: string,
	input: UpdateExpenseInput
) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const expenseId = yield* Schema.decodeUnknownEffect(ExpenseId)(id);
			const values = yield* Schema.decodeUnknownEffect(
				DomainUpdateExpenseInput
			)(input);
			const repo = yield* ExpensesRepo;
			return yield* repo
				.update(parsedUserId, expenseId, values)
				.pipe(Effect.catchTag('ExpenseNotFound', () => Effect.succeed(null)));
		})
	);
}

export function deleteExpense(userId: string, id: string) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const expenseId = yield* Schema.decodeUnknownEffect(ExpenseId)(id);
			const repo = yield* ExpensesRepo;
			return yield* repo
				.delete(parsedUserId, expenseId)
				.pipe(Effect.catchTag('ExpenseNotFound', () => Effect.succeed(null)));
		})
	);
}
