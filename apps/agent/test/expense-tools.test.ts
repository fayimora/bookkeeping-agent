import { CategoriesRepo } from '@bookeeping-agent/db';
import { UserId } from '@bookeeping-agent/domain';
import { assert, describe, it as effectIt, layer } from '@effect/vitest';
import { Effect, Layer, Schema } from 'effect';

import { categorySlugForCreate } from '../src/tools/categories/tools';
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

		it.effect('rejects empty expense updates', () =>
			Effect.gen(function* () {
				const userId = yield* testUserId;
				const error = yield* Effect.flip(
					buildUpdateExpenseValues(userId, { id: expenseId })
				);

				assert.strictEqual(error._tag, 'EmptyUpdate');
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
