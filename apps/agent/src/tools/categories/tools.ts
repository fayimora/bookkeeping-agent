import { NotFoundError } from '@bookeeping-agent/db/errors';
import {
	createCategory,
	deleteCategory,
	getCategoryById,
	getCategoryBySlug,
	listCategories,
	updateCategory,
} from '@bookeeping-agent/db/queries/categories';
import { defineTool, type ToolDefinition } from '@flue/runtime';
import { Result } from 'better-result';

import { ToolInputError, throwToolError, unwrapToolResult } from '../result.ts';
import {
	type CreateCategoryToolInput,
	createCategoryParameters,
	type DeleteCategoryToolInput,
	deleteCategoryParameters,
	type GetCategoryToolInput,
	getCategoryParameters,
	listCategoriesParameters,
	type UpdateCategoryToolInput,
	updateCategoryParameters,
} from './schemas.ts';

function slugifyCategoryName(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function resolveCategory(userId: string, input: GetCategoryToolInput) {
	return Result.gen(async function* () {
		if (input.id) {
			return Result.ok(yield* Result.await(getCategoryById(userId, input.id)));
		}

		if (input.slug) {
			return Result.ok(
				yield* Result.await(getCategoryBySlug(userId, input.slug.trim()))
			);
		}

		return Result.err(
			new ToolInputError({ message: 'Provide category id or slug.' })
		);
	});
}

function resolveCategoryOrError(userId: string, input: GetCategoryToolInput) {
	return Result.gen(async function* () {
		const category = yield* Result.await(resolveCategory(userId, input));

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

export function categoryTools(userId: string): ToolDefinition[] {
	const listCategoriesTool = defineTool({
		name: 'list_categories',
		description:
			'List the available expense categories. Use this before creating or updating an expense when you need a valid category.',
		parameters: listCategoriesParameters,
		execute: async () => {
			const categories = unwrapToolResult(await listCategories(userId));
			return JSON.stringify({ categories });
		},
	});

	const getCategoryTool = defineTool({
		name: 'get_category',
		description: 'Get one expense category by id or slug.',
		parameters: getCategoryParameters,
		execute: async (input: GetCategoryToolInput) => {
			const category = unwrapToolResult(
				await resolveCategoryOrError(userId, input)
			);
			return JSON.stringify({ category });
		},
	});

	const createCategoryTool = defineTool({
		name: 'create_category',
		description:
			'Create a new expense category after the category name is clear. If slug is omitted, it is generated from the name.',
		parameters: createCategoryParameters,
		execute: async (input: CreateCategoryToolInput) => {
			const name = input.name.trim();
			const slug = input.slug?.trim() || slugifyCategoryName(name);

			if (!slug) {
				throwToolError(
					new ToolInputError({
						message: 'Provide a category slug or a name that can form a slug.',
					})
				);
			}

			const category = unwrapToolResult(
				await createCategory(userId, { name, slug })
			);
			return JSON.stringify({ category });
		},
	});

	const updateCategoryTool = defineTool({
		name: 'update_category',
		description:
			'Update an expense category by id or slug after the requested name or slug change is clear.',
		parameters: updateCategoryParameters,
		execute: async (input: UpdateCategoryToolInput) => {
			const existingCategory = unwrapToolResult(
				await resolveCategoryOrError(userId, input)
			);
			const values: { name?: string; slug?: string } = {};

			if (input.name !== undefined) {
				values.name = input.name.trim();
			}

			if (input.newSlug !== undefined) {
				values.slug = input.newSlug.trim();
			}

			if (Object.keys(values).length === 0) {
				throwToolError(
					new ToolInputError({
						message: 'Provide a category name or newSlug to update.',
					})
				);
			}

			const category = unwrapToolResult(
				await updateCategory(userId, existingCategory.id, values)
			);

			return JSON.stringify({ category });
		},
	});

	const deleteCategoryTool = defineTool({
		name: 'delete_category',
		description:
			'Delete an expense category by id or slug only after user confirmation. Existing expenses in this category become uncategorized.',
		parameters: deleteCategoryParameters,
		execute: async (input: DeleteCategoryToolInput) => {
			const existingCategory = unwrapToolResult(
				await resolveCategoryOrError(userId, input)
			);
			const category = unwrapToolResult(
				await deleteCategory(userId, existingCategory.id)
			);

			return JSON.stringify({ deletedCategory: category });
		},
	});

	return [
		listCategoriesTool,
		getCategoryTool,
		createCategoryTool,
		updateCategoryTool,
		deleteCategoryTool,
	];
}
