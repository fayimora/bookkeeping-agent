import {
	createCategory,
	deleteCategory,
	getCategoryById,
	getCategoryBySlug,
	listCategories,
	updateCategory,
} from '@bookeeping-agent/db/queries/categories';
import { defineTool, type ToolDefinition } from '@flue/runtime';

import {
	createCategoryParameters,
	deleteCategoryParameters,
	type GetCategoryToolInput,
	getCategoryParameters,
	listCategoriesParameters,
	updateCategoryParameters,
} from './schemas.ts';

function slugifyCategoryName(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

async function resolveCategory(userId: string, input: GetCategoryToolInput) {
	if (input.id) {
		return await getCategoryById(userId, input.id);
	}

	if (input.slug) {
		return await getCategoryBySlug(userId, input.slug.trim());
	}

	throw new Error('Provide category id or slug.');
}

async function resolveCategoryOrThrow(
	userId: string,
	input: GetCategoryToolInput
) {
	const category = await resolveCategory(userId, input);

	if (!category) {
		throw new Error('Category not found.');
	}

	return category;
}

export function categoryTools(userId: string): ToolDefinition[] {
	const listCategoriesTool = defineTool({
		description:
			'List the available expense categories. Use this before creating or updating an expense when you need a valid category.',
		input: listCategoriesParameters,
		name: 'list_categories',
		run: async () => {
			const categories = await listCategories(userId);
			return JSON.stringify({ categories });
		},
	});

	const getCategoryTool = defineTool({
		description: 'Get one expense category by id or slug.',
		input: getCategoryParameters,
		name: 'get_category',
		run: async ({ input }) => {
			const category = await resolveCategoryOrThrow(userId, input);
			return JSON.stringify({ category });
		},
	});

	const createCategoryTool = defineTool({
		description:
			'Create a new expense category after the category name is clear. If slug is omitted, it is generated from the name.',
		input: createCategoryParameters,
		name: 'create_category',
		run: async ({ input }) => {
			const name = input.name.trim();
			const slug = input.slug?.trim() || slugifyCategoryName(name);

			if (!slug) {
				throw new Error(
					'Provide a category slug or a name that can form a slug.'
				);
			}

			const category = await createCategory(userId, { name, slug });
			return JSON.stringify({ category });
		},
	});

	const updateCategoryTool = defineTool({
		description:
			'Update an expense category by id or slug after the requested name or slug change is clear.',
		input: updateCategoryParameters,
		name: 'update_category',
		run: async ({ input }) => {
			const existingCategory = await resolveCategoryOrThrow(userId, input);
			const values: { name?: string; slug?: string } = {};

			if (input.name !== undefined) {
				values.name = input.name.trim();
			}

			if (input.newSlug !== undefined) {
				values.slug = input.newSlug.trim();
			}

			if (Object.keys(values).length === 0) {
				throw new Error('Provide a category name or newSlug to update.');
			}

			const category = await updateCategory(
				userId,
				existingCategory.id,
				values
			);

			if (!category) {
				throw new Error('Category not found.');
			}

			return JSON.stringify({ category });
		},
	});

	const deleteCategoryTool = defineTool({
		description:
			'Delete an expense category by id or slug only after user confirmation. Existing expenses in this category become uncategorized.',
		input: deleteCategoryParameters,
		name: 'delete_category',
		run: async ({ input }) => {
			const existingCategory = await resolveCategoryOrThrow(userId, input);
			const category = await deleteCategory(userId, existingCategory.id);

			if (!category) {
				throw new Error('Category not found.');
			}

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
