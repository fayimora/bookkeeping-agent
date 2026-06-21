import { parseResult } from '@bookeeping-agent/db/errors';
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
import { Result } from 'better-result';
import { z } from 'zod';

import { getSessionResult, serializeResult } from './result';

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
	async () =>
		serializeResult(
			await Result.gen(async function* () {
				const session = yield* Result.await(getSessionResult());

				return await listCategoryRecords(session.user.id);
			})
		)
);

export const getCategoryById = createServerFn({ method: 'GET' })
	.validator((data: unknown) => data)
	.handler(async ({ data }) =>
		serializeResult(
			await Result.gen(async function* () {
				const input = yield* parseResult(() =>
					categoryIdInputSchema.parse(data)
				);
				const session = yield* Result.await(getSessionResult());

				return await getCategoryRecordById(session.user.id, input.id);
			})
		)
	);

export const getCategoryBySlug = createServerFn({ method: 'GET' })
	.validator((data: unknown) => data)
	.handler(async ({ data }) =>
		serializeResult(
			await Result.gen(async function* () {
				const input = yield* parseResult(() =>
					categorySlugInputSchema.parse(data)
				);
				const session = yield* Result.await(getSessionResult());

				return await getCategoryRecordBySlug(session.user.id, input.slug);
			})
		)
	);

export const createCategory = createServerFn({ method: 'POST' })
	.validator((data: unknown) => data)
	.handler(async ({ data }) =>
		serializeResult(
			await Result.gen(async function* () {
				const input = yield* parseResult(() =>
					createCategorySchema.parse(data)
				);
				const session = yield* Result.await(getSessionResult());

				return await createCategoryRecord(session.user.id, input);
			})
		)
	);

export const updateCategory = createServerFn({ method: 'POST' })
	.validator((data: unknown) => data)
	.handler(async ({ data }) =>
		serializeResult(
			await Result.gen(async function* () {
				const input = yield* parseResult(() =>
					updateCategoryInputSchema.parse(data)
				);
				const session = yield* Result.await(getSessionResult());

				return await updateCategoryRecord(
					session.user.id,
					input.id,
					input.input
				);
			})
		)
	);

export const deleteCategory = createServerFn({ method: 'POST' })
	.validator((data: unknown) => data)
	.handler(async ({ data }) =>
		serializeResult(
			await Result.gen(async function* () {
				const input = yield* parseResult(() =>
					categoryIdInputSchema.parse(data)
				);
				const session = yield* Result.await(getSessionResult());

				return await deleteCategoryRecord(session.user.id, input.id);
			})
		)
	);
