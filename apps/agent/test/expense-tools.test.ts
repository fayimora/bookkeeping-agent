import { CategoriesRepo, ExpensesRepo } from '@bookeeping-agent/db';
import {
	categorySlugForCreate,
	Expense,
	type ExpensePage,
	UserId,
} from '@bookeeping-agent/domain';
import { assert, describe, it as effectIt, layer } from '@effect/vitest';
import { Effect, Layer, Schema } from 'effect';

import { listExpenseWorkflow } from '../src/tools/expenses/tools';
import { buildUpdateExpenseValues } from '../src/tools/expenses/utils';

const CategoriesTestLive = Layer.succeed(
	CategoriesRepo,
	CategoriesRepo.of({
		create: () => Effect.die('Unexpected CategoriesRepo.create'),
		delete: () => Effect.die('Unexpected CategoriesRepo.delete'),
		getById: () => Effect.die('Unexpected CategoriesRepo.getById'),
		getBySlug: () => Effect.die('Unexpected CategoriesRepo.getBySlug'),
		list: () => Effect.die('Unexpected CategoriesRepo.list'),
		update: () => Effect.die('Unexpected CategoriesRepo.update'),
	})
);

const testUserId = Schema.decodeUnknownEffect(UserId)('tool-test-user');
const expenseId = '11111111-1111-4111-8111-111111111111';

describe('category tool workflows', () => {
	effectIt.effect('generates a slug when the supplied slug is whitespace', () =>
		Effect.sync(() => {
			assert.strictEqual(
				categorySlugForCreate('Business Meals', '   '),
				'business-meals'
			);
		})
	);
});

describe('expense tool workflows', () => {
	layer(CategoriesTestLive)((it) => {
		it.effect('rejects category clear/value conflicts', () =>
			Effect.gen(function* () {
				const userId = yield* testUserId;
				const error = yield* Effect.flip(
					buildUpdateExpenseValues(userId, {
						categoryId: '22222222-2222-4222-8222-222222222222',
						clearCategory: true,
						id: expenseId,
					})
				);

				assert.strictEqual(error._tag, 'ConflictingUpdate');
				if (error._tag === 'ConflictingUpdate') {
					assert.strictEqual(error.field, 'category');
				}
			})
		);

		it.effect('rejects description clear/value conflicts', () =>
			Effect.gen(function* () {
				const userId = yield* testUserId;
				const error = yield* Effect.flip(
					buildUpdateExpenseValues(userId, {
						clearDescription: true,
						description: 'replacement',
						id: expenseId,
					})
				);

				assert.strictEqual(error._tag, 'ConflictingUpdate');
				if (error._tag === 'ConflictingUpdate') {
					assert.strictEqual(error.field, 'description');
				}
			})
		);

		it.effect('normalizes update values through the domain schema', () =>
			Effect.gen(function* () {
				const userId = yield* testUserId;
				const values = yield* buildUpdateExpenseValues(userId, {
					currency: ' gbp ',
					description: '  Client lunch  ',
					id: expenseId,
					vendor: '  Cafe  ',
				});

				assert.strictEqual(values.currency, 'GBP');
				assert.strictEqual(values.description, 'Client lunch');
				assert.strictEqual(values.vendor, 'Cafe');
			})
		);
	});
});

const requestedPages: ExpensePage[] = [];

const ExpensesPageTestLive = Layer.effect(
	ExpensesRepo,
	Effect.gen(function* () {
		const expense = yield* Schema.decodeUnknownEffect(Expense)({
			amountCents: 100,
			categoryId: null,
			createdAt: new Date('2026-07-01T00:00:00Z'),
			currency: 'GBP',
			date: '2026-07-01',
			description: null,
			id: expenseId,
			updatedAt: new Date('2026-07-01T00:00:00Z'),
			userId: 'tool-test-user',
			vendor: 'Cafe',
		});
		const die = (name: string) => () =>
			Effect.die(`Unexpected ExpensesRepo.${name}`);
		return ExpensesRepo.of({
			create: die('create'),
			delete: die('delete'),
			getById: die('getById'),
			list: die('list'),
			listPage: (_userId, _filters, page) => {
				requestedPages.push(page);
				return Effect.succeed({ expenses: [expense], hasMore: true });
			},
			update: die('update'),
		});
	})
);

describe('list_expenses workflow', () => {
	layer(Layer.mergeAll(CategoriesTestLive, ExpensesPageTestLive))((it) => {
		it.effect('defaults to a 50-row page and reports the next offset', () =>
			Effect.gen(function* () {
				const userId = yield* testUserId;
				requestedPages.length = 0;

				const first = yield* listExpenseWorkflow(userId, {});
				assert.deepStrictEqual(requestedPages[0], { limit: 50, offset: 0 });
				assert.strictEqual(first.count, 1);
				assert.isTrue(first.hasMore);
				assert.strictEqual(first.nextOffset, 1);

				yield* listExpenseWorkflow(userId, { limit: 10, offset: 20 });
				assert.deepStrictEqual(requestedPages[1], { limit: 10, offset: 20 });
			})
		);
	});
});
