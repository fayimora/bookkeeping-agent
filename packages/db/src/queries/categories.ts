import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '..';
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

export async function listCategories(userId: string) {
	const parsedUserId = userIdSchema.parse(userId);

	return await db
		.select()
		.from(categories)
		.where(eq(categories.userId, parsedUserId))
		.orderBy(asc(categories.name));
}

export async function getCategoryById(userId: string, id: string) {
	const parsedUserId = userIdSchema.parse(userId);
	const categoryId = categoryIdSchema.parse(id);
	const [category] = await db
		.select()
		.from(categories)
		.where(
			and(eq(categories.id, categoryId), eq(categories.userId, parsedUserId))
		)
		.limit(1);

	return category ?? null;
}

export async function getCategoryBySlug(userId: string, slug: string) {
	const parsedUserId = userIdSchema.parse(userId);
	const parsedSlug = createCategorySchema.shape.slug.parse(slug);
	const [category] = await db
		.select()
		.from(categories)
		.where(
			and(eq(categories.slug, parsedSlug), eq(categories.userId, parsedUserId))
		)
		.limit(1);

	return category ?? null;
}

export async function createCategory(
	userId: string,
	input: CreateCategoryInput
) {
	const parsedUserId = userIdSchema.parse(userId);
	const values = createCategorySchema.parse(input);
	const [category] = await db
		.insert(categories)
		.values({
			...values,
			userId: parsedUserId,
		})
		.returning();

	return category;
}

export async function updateCategory(
	userId: string,
	id: string,
	input: UpdateCategoryInput
) {
	const parsedUserId = userIdSchema.parse(userId);
	const categoryId = categoryIdSchema.parse(id);
	const values = updateCategorySchema.parse(input);
	const [category] = await db
		.update(categories)
		.set({
			...values,
			updatedAt: new Date(),
		})
		.where(
			and(eq(categories.id, categoryId), eq(categories.userId, parsedUserId))
		)
		.returning();

	return category ?? null;
}

export async function deleteCategory(userId: string, id: string) {
	const parsedUserId = userIdSchema.parse(userId);
	const categoryId = categoryIdSchema.parse(id);
	const [category] = await db
		.delete(categories)
		.where(
			and(eq(categories.id, categoryId), eq(categories.userId, parsedUserId))
		)
		.returning();

	return category ?? null;
}
