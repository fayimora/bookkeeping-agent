import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '..';
import { categories } from '../schema';

const categoryIdSchema = z.uuid();

export const createCategorySchema = z.object({
	name: z.string().trim().min(1).max(100),
	slug: z.string().trim().min(1).max(100),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;

export async function listCategories() {
	return await db.select().from(categories).orderBy(asc(categories.name));
}

export async function getCategoryById(id: string) {
	const categoryId = categoryIdSchema.parse(id);
	const [category] = await db
		.select()
		.from(categories)
		.where(eq(categories.id, categoryId))
		.limit(1);

	return category ?? null;
}

export async function getCategoryBySlug(slug: string) {
	const parsedSlug = createCategorySchema.shape.slug.parse(slug);
	const [category] = await db
		.select()
		.from(categories)
		.where(eq(categories.slug, parsedSlug))
		.limit(1);

	return category ?? null;
}

export async function createCategory(input: CreateCategoryInput) {
	const values = createCategorySchema.parse(input);
	const [category] = await db.insert(categories).values(values).returning();

	return category;
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
	const categoryId = categoryIdSchema.parse(id);
	const values = updateCategorySchema.parse(input);
	const [category] = await db
		.update(categories)
		.set({
			...values,
			updatedAt: new Date(),
		})
		.where(eq(categories.id, categoryId))
		.returning();

	return category ?? null;
}

export async function deleteCategory(id: string) {
	const categoryId = categoryIdSchema.parse(id);
	const [category] = await db
		.delete(categories)
		.where(eq(categories.id, categoryId))
		.returning();

	return category ?? null;
}
