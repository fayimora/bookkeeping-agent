import { CategoriesRepo } from '@bookeeping-agent/db';
import { createServerFn } from '@tanstack/react-start';
import { Effect } from 'effect';

import { CurrentUser } from './auth';
import { runAuthenticatedEffect } from './http';
import { CategoryValidators } from './validators';

export const listCategories = createServerFn({ method: 'GET' }).handler(() =>
	runAuthenticatedEffect(
		Effect.gen(function* () {
			const currentUser = yield* CurrentUser;
			const categories = yield* CategoriesRepo;
			const records = yield* categories.list(currentUser.id);
			return Array.from(records);
		})
	)
);

export const getCategoryById = createServerFn({ method: 'GET' })
	.validator(CategoryValidators.id)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const categories = yield* CategoriesRepo;
				return yield* categories.getById(currentUser.id, data.id);
			})
		)
	);

export const getCategoryBySlug = createServerFn({ method: 'GET' })
	.validator(CategoryValidators.slug)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const categories = yield* CategoriesRepo;
				return yield* categories.getBySlug(currentUser.id, data.slug);
			})
		)
	);

export const createCategory = createServerFn({ method: 'POST' })
	.validator(CategoryValidators.create)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const categories = yield* CategoriesRepo;
				return yield* categories.create(currentUser.id, data);
			})
		)
	);

export const updateCategory = createServerFn({ method: 'POST' })
	.validator(CategoryValidators.update)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const categories = yield* CategoriesRepo;
				return yield* categories.update(currentUser.id, data.id, data.input);
			})
		)
	);

export const deleteCategory = createServerFn({ method: 'POST' })
	.validator(CategoryValidators.id)
	.handler(({ data }) =>
		runAuthenticatedEffect(
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser;
				const categories = yield* CategoriesRepo;
				return yield* categories.delete(currentUser.id, data.id);
			})
		)
	);
