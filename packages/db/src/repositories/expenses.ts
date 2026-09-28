import {
	type CategoryId,
	CategoryNotOwned,
	type CreateExpenseInput,
	EmptyUpdate,
	type Expense,
	type ExpenseId,
	ExpenseNotFound,
	Expense as ExpenseSchema,
	type ListExpensesFilters,
	type UpdateExpenseInput,
	type UserId,
} from '@bookeeping-agent/domain';
import { and, desc, eq, gte, ilike, lte, or, type SQL } from 'drizzle-orm';
import { Context, Effect, Layer, Schema } from 'effect';

import { Database, type DatabaseService } from '#db/database';
import {
	type DbError,
	dbError,
	missingRow,
	transactionError,
} from '#db/errors';
import { categories, expenses } from '#db/schema';

export interface ExpensesRepoService {
	readonly create: (
		userId: UserId,
		input: CreateExpenseInput
	) => Effect.Effect<Expense, CategoryNotOwned | DbError>;
	readonly delete: (
		userId: UserId,
		expenseId: ExpenseId
	) => Effect.Effect<Expense, DbError | ExpenseNotFound>;
	readonly getById: (
		userId: UserId,
		expenseId: ExpenseId
	) => Effect.Effect<Expense, DbError | ExpenseNotFound>;
	readonly list: (
		userId: UserId,
		filters: ListExpensesFilters
	) => Effect.Effect<readonly Expense[], DbError>;
	readonly update: (
		userId: UserId,
		expenseId: ExpenseId,
		input: UpdateExpenseInput
	) => Effect.Effect<
		Expense,
		CategoryNotOwned | DbError | EmptyUpdate | ExpenseNotFound
	>;
}

type Transaction = Parameters<Parameters<DatabaseService['transaction']>[0]>[0];

export class ExpensesRepo extends Context.Service<
	ExpensesRepo,
	ExpensesRepoService
>()('@bookeeping-agent/db/ExpensesRepo') {}

const decodeExpenses = (operation: string, rows: unknown) =>
	Schema.decodeUnknownEffect(Schema.Array(ExpenseSchema))(rows).pipe(
		dbError(operation)
	);

const decodeExpense = (operation: string, row: unknown) =>
	Schema.decodeUnknownEffect(ExpenseSchema)(row).pipe(dbError(operation));

export const ExpensesRepoLive = Layer.effect(
	ExpensesRepo,
	Effect.gen(function* () {
		const db = yield* Database;

		const ensureCategoryOwned = Effect.fn('ExpensesRepo.ensureCategoryOwned')(
			function* (
				tx: Transaction,
				userId: UserId,
				categoryId: CategoryId,
				operation: string
			) {
				const rows = yield* tx
					.select({ id: categories.id })
					.from(categories)
					.where(
						and(eq(categories.id, categoryId), eq(categories.userId, userId))
					)
					.limit(1)
					.for('key share')
					.pipe(dbError(operation));
				if (rows.length === 0) {
					return yield* Effect.fail(
						CategoryNotOwned.make({ categoryId, userId })
					);
				}
			}
		);

		const list = Effect.fn('ExpensesRepo.list')(function* (
			userId: UserId,
			filters: ListExpensesFilters
		) {
			const conditions: SQL[] = [eq(expenses.userId, userId)];

			if (filters.categoryId !== undefined) {
				conditions.push(eq(expenses.categoryId, filters.categoryId));
			}
			if (filters.from !== undefined) {
				conditions.push(gte(expenses.date, filters.from));
			}
			if (filters.to !== undefined) {
				conditions.push(lte(expenses.date, filters.to));
			}
			if (filters.search !== undefined) {
				const searchPattern = `%${filters.search}%`;
				const searchCondition = or(
					ilike(expenses.vendor, searchPattern),
					ilike(expenses.description, searchPattern)
				);
				if (searchCondition !== undefined) {
					conditions.push(searchCondition);
				}
			}

			const rows = yield* db
				.select()
				.from(expenses)
				.where(and(...conditions))
				.orderBy(desc(expenses.date), desc(expenses.createdAt))
				.pipe(dbError('ExpensesRepo.list.query'));

			return yield* decodeExpenses('ExpensesRepo.list.decode', rows);
		});

		const getById = Effect.fn('ExpensesRepo.getById')(function* (
			userId: UserId,
			expenseId: ExpenseId
		) {
			const rows = yield* db
				.select()
				.from(expenses)
				.where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
				.limit(1)
				.pipe(dbError('ExpensesRepo.getById.query'));
			const [row] = rows;
			if (row === undefined) {
				return yield* Effect.fail(ExpenseNotFound.make({ expenseId }));
			}

			return yield* decodeExpense('ExpensesRepo.getById.decode', row);
		});

		const create = Effect.fn('ExpensesRepo.create')(function* (
			userId: UserId,
			input: CreateExpenseInput
		) {
			return yield* db
				.transaction((tx) =>
					Effect.gen(function* () {
						if (input.categoryId !== undefined && input.categoryId !== null) {
							yield* ensureCategoryOwned(
								tx,
								userId,
								input.categoryId,
								'ExpensesRepo.create.category'
							);
						}

						const rows = yield* tx
							.insert(expenses)
							.values({ ...input, userId })
							.returning()
							.pipe(dbError('ExpensesRepo.create.insert'));
						const [row] = rows;
						if (row === undefined) {
							return yield* Effect.fail(
								missingRow('ExpensesRepo.create.insert')
							);
						}

						return yield* decodeExpense('ExpensesRepo.create.decode', row);
					})
				)
				.pipe(transactionError('ExpensesRepo.create.transaction'));
		});

		const update = Effect.fn('ExpensesRepo.update')(function* (
			userId: UserId,
			expenseId: ExpenseId,
			input: UpdateExpenseInput
		) {
			if (Object.keys(input).length === 0) {
				return yield* Effect.fail(EmptyUpdate.make({ entity: 'expense' }));
			}

			return yield* db
				.transaction((tx) =>
					Effect.gen(function* () {
						if (input.categoryId !== undefined && input.categoryId !== null) {
							yield* ensureCategoryOwned(
								tx,
								userId,
								input.categoryId,
								'ExpensesRepo.update.category'
							);
						}

						const rows = yield* tx
							.update(expenses)
							.set({ ...input, updatedAt: new Date() })
							.where(
								and(eq(expenses.id, expenseId), eq(expenses.userId, userId))
							)
							.returning()
							.pipe(dbError('ExpensesRepo.update.update'));
						const [row] = rows;
						if (row === undefined) {
							return yield* Effect.fail(ExpenseNotFound.make({ expenseId }));
						}

						return yield* decodeExpense('ExpensesRepo.update.decode', row);
					})
				)
				.pipe(transactionError('ExpensesRepo.update.transaction'));
		});

		const deleteExpense = Effect.fn('ExpensesRepo.delete')(function* (
			userId: UserId,
			expenseId: ExpenseId
		) {
			const rows = yield* db
				.delete(expenses)
				.where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
				.returning()
				.pipe(dbError('ExpensesRepo.delete.query'));
			const [row] = rows;
			if (row === undefined) {
				return yield* Effect.fail(ExpenseNotFound.make({ expenseId }));
			}

			return yield* decodeExpense('ExpensesRepo.delete.decode', row);
		});

		return ExpensesRepo.of({
			create,
			delete: deleteExpense,
			getById,
			list,
			update,
		});
	})
);
