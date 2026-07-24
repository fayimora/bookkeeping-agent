import {
	Category,
	CategoryId,
	CreateCategoryInput as DomainCreateCategoryInput,
	UpdateCategoryInput as DomainUpdateCategoryInput,
	UserId,
} from '@bookeeping-agent/domain';
import { Effect, Schema } from 'effect';
import { z } from 'zod';

import { CategoriesRepo } from '#db/repositories';
import { repositoryRuntime } from '#db/runtime';

// Temporary TanStack compatibility schemas; removed in Chunk 4.
export const createCategorySchema = z.object({
	name: z.string().trim().min(1).max(100),
	slug: z.string().trim().min(1).max(100),
});
export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;

export function listCategories(userId: string) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const repo = yield* CategoriesRepo;
			const categories = yield* repo.list(parsedUserId);
			return Array.from(categories);
		})
	);
}

export function getCategoryById(userId: string, id: string) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const categoryId = yield* Schema.decodeUnknownEffect(CategoryId)(id);
			const repo = yield* CategoriesRepo;
			return yield* repo
				.getById(parsedUserId, categoryId)
				.pipe(Effect.catchTag('CategoryNotFound', () => Effect.succeed(null)));
		})
	);
}

export function getCategoryBySlug(userId: string, slug: string) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const parsedSlug = yield* Schema.decodeUnknownEffect(
				Category.fields.slug
			)(slug);
			const repo = yield* CategoriesRepo;
			return yield* repo
				.getBySlug(parsedUserId, parsedSlug)
				.pipe(Effect.catchTag('CategoryNotFound', () => Effect.succeed(null)));
		})
	);
}

export function createCategory(userId: string, input: CreateCategoryInput) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const values = yield* Schema.decodeUnknownEffect(
				DomainCreateCategoryInput
			)(input);
			const repo = yield* CategoriesRepo;
			return yield* repo.create(parsedUserId, values);
		})
	);
}

export function updateCategory(
	userId: string,
	id: string,
	input: UpdateCategoryInput
) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const categoryId = yield* Schema.decodeUnknownEffect(CategoryId)(id);
			const values = yield* Schema.decodeUnknownEffect(
				DomainUpdateCategoryInput
			)(input);
			const repo = yield* CategoriesRepo;
			return yield* repo
				.update(parsedUserId, categoryId, values)
				.pipe(Effect.catchTag('CategoryNotFound', () => Effect.succeed(null)));
		})
	);
}

export function deleteCategory(userId: string, id: string) {
	return repositoryRuntime.runPromise(
		Effect.gen(function* () {
			const parsedUserId = yield* Schema.decodeUnknownEffect(UserId)(userId);
			const categoryId = yield* Schema.decodeUnknownEffect(CategoryId)(id);
			const repo = yield* CategoriesRepo;
			return yield* repo
				.delete(parsedUserId, categoryId)
				.pipe(Effect.catchTag('CategoryNotFound', () => Effect.succeed(null)));
		})
	);
}
