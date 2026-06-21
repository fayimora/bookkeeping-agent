import { Result } from 'better-result';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '..';
import { dbResult, NotFoundError, parseResult } from '../errors';
import { categories } from '../schema';

const categoryIdSchema = z.uuid();
const userIdSchema = z.string().min(1);

export const createCategorySchema = z.object({
	name: z.string().trim().min(1).max(100),
	slug: z.string().trim().min(1).max(100),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;

export function listCategories(userId: string) {
	return Result.gen(async function* () {
		const parsedUserId = yield* parseResult(() => userIdSchema.parse(userId));

		const rows = yield* Result.await(
			dbResult(
				async () =>
					await db
						.select()
						.from(categories)
						.where(eq(categories.userId, parsedUserId))
						.orderBy(asc(categories.name))
			)
		);

		return Result.ok(rows);
	});
}

export function getCategoryById(userId: string, id: string) {
	return Result.gen(async function* () {
		const parsedUserId = yield* parseResult(() => userIdSchema.parse(userId));
		const categoryId = yield* parseResult(() => categoryIdSchema.parse(id));

		const category = yield* Result.await(
			dbResult(async () => {
				const [row] = await db
					.select()
					.from(categories)
					.where(
						and(
							eq(categories.id, categoryId),
							eq(categories.userId, parsedUserId)
						)
					)
					.limit(1);

				return row ?? null;
			})
		);

		return Result.ok(category);
	});
}

export function getCategoryBySlug(userId: string, slug: string) {
	return Result.gen(async function* () {
		const parsedUserId = yield* parseResult(() => userIdSchema.parse(userId));
		const parsedSlug = yield* parseResult(() =>
			createCategorySchema.shape.slug.parse(slug)
		);

		const category = yield* Result.await(
			dbResult(async () => {
				const [row] = await db
					.select()
					.from(categories)
					.where(
						and(
							eq(categories.slug, parsedSlug),
							eq(categories.userId, parsedUserId)
						)
					)
					.limit(1);

				return row ?? null;
			})
		);

		return Result.ok(category);
	});
}

export function createCategory(userId: string, input: CreateCategoryInput) {
	return Result.gen(async function* () {
		const parsedUserId = yield* parseResult(() => userIdSchema.parse(userId));
		const values = yield* parseResult(() => createCategorySchema.parse(input));

		const category = yield* Result.await(
			dbResult(async () => {
				const [row] = await db
					.insert(categories)
					.values({ ...values, userId: parsedUserId })
					.returning();

				return row ?? null;
			})
		);

		return category
			? Result.ok(category)
			: Result.err(
					new NotFoundError({
						message: 'Category was not created.',
						resource: 'category',
					})
				);
	});
}

export function updateCategory(
	userId: string,
	id: string,
	input: UpdateCategoryInput
) {
	return Result.gen(async function* () {
		const parsedUserId = yield* parseResult(() => userIdSchema.parse(userId));
		const categoryId = yield* parseResult(() => categoryIdSchema.parse(id));
		const values = yield* parseResult(() => updateCategorySchema.parse(input));

		const category = yield* Result.await(
			dbResult(async () => {
				const [row] = await db
					.update(categories)
					.set({ ...values, updatedAt: new Date() })
					.where(
						and(
							eq(categories.id, categoryId),
							eq(categories.userId, parsedUserId)
						)
					)
					.returning();

				return row ?? null;
			})
		);

		return category
			? Result.ok(category)
			: Result.err(
					new NotFoundError({
						message: 'Category not found.',
						resource: 'category',
					})
				);
	});
}

export function deleteCategory(userId: string, id: string) {
	return Result.gen(async function* () {
		const parsedUserId = yield* parseResult(() => userIdSchema.parse(userId));
		const categoryId = yield* parseResult(() => categoryIdSchema.parse(id));

		const category = yield* Result.await(
			dbResult(async () => {
				const [row] = await db
					.delete(categories)
					.where(
						and(
							eq(categories.id, categoryId),
							eq(categories.userId, parsedUserId)
						)
					)
					.returning();

				return row ?? null;
			})
		);

		return category
			? Result.ok(category)
			: Result.err(
					new NotFoundError({
						message: 'Category not found.',
						resource: 'category',
					})
				);
	});
}
