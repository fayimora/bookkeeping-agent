import {
	createCategory as createCategoryRecord,
	createCategorySchema,
	deleteCategory as deleteCategoryRecord,
	getCategoryById as getCategoryRecordById,
	getCategoryBySlug as getCategoryRecordBySlug,
	listCategories as listCategoryRecords,
	updateCategory as updateCategoryRecord,
	updateCategorySchema,
} from '@bookeeping-agent/db/queries/categories';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const categoryIdInputSchema = z.object({
	id: z.uuid(),
});

const categorySlugInputSchema = z.object({
	slug: createCategorySchema.shape.slug,
});

const updateCategoryInputSchema = z.object({
	id: z.uuid(),
	input: updateCategorySchema,
});

export const listCategories = createServerFn({ method: 'GET' }).handler(
	async () => await listCategoryRecords()
);

export const getCategoryById = createServerFn({ method: 'GET' })
	.validator((data: unknown) => categoryIdInputSchema.parse(data))
	.handler(async ({ data }) => await getCategoryRecordById(data.id));

export const getCategoryBySlug = createServerFn({ method: 'GET' })
	.validator((data: unknown) => categorySlugInputSchema.parse(data))
	.handler(async ({ data }) => await getCategoryRecordBySlug(data.slug));

export const createCategory = createServerFn({ method: 'POST' })
	.validator((data: unknown) => createCategorySchema.parse(data))
	.handler(async ({ data }) => await createCategoryRecord(data));

export const updateCategory = createServerFn({ method: 'POST' })
	.validator((data: unknown) => updateCategoryInputSchema.parse(data))
	.handler(async ({ data }) => await updateCategoryRecord(data.id, data.input));

export const deleteCategory = createServerFn({ method: 'POST' })
	.validator((data: unknown) => categoryIdInputSchema.parse(data))
	.handler(async ({ data }) => await deleteCategoryRecord(data.id));
