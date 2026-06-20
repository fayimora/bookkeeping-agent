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

import { ensureSession } from '../lib/auth-functions';

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
	async () => {
		const session = await ensureSession();

		return await listCategoryRecords(session.user.id);
	}
);

export const getCategoryById = createServerFn({ method: 'GET' })
	.validator((data: unknown) => categoryIdInputSchema.parse(data))
	.handler(async ({ data }) => {
		const session = await ensureSession();

		return await getCategoryRecordById(session.user.id, data.id);
	});

export const getCategoryBySlug = createServerFn({ method: 'GET' })
	.validator((data: unknown) => categorySlugInputSchema.parse(data))
	.handler(async ({ data }) => {
		const session = await ensureSession();

		return await getCategoryRecordBySlug(session.user.id, data.slug);
	});

export const createCategory = createServerFn({ method: 'POST' })
	.validator((data: unknown) => createCategorySchema.parse(data))
	.handler(async ({ data }) => {
		const session = await ensureSession();

		return await createCategoryRecord(session.user.id, data);
	});

export const updateCategory = createServerFn({ method: 'POST' })
	.validator((data: unknown) => updateCategoryInputSchema.parse(data))
	.handler(async ({ data }) => {
		const session = await ensureSession();

		return await updateCategoryRecord(session.user.id, data.id, data.input);
	});

export const deleteCategory = createServerFn({ method: 'POST' })
	.validator((data: unknown) => categoryIdInputSchema.parse(data))
	.handler(async ({ data }) => {
		const session = await ensureSession();

		return await deleteCategoryRecord(session.user.id, data.id);
	});
