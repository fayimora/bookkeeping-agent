import { CategoriesRepo } from '@bookeeping-agent/db';
import {
	Category,
	CategoryId,
	CategoryNotFound,
	CreateCategoryInput,
	EmptyUpdate,
	UpdateCategoryInput,
	UserId,
} from '@bookeeping-agent/domain';
import { defineTool, type ToolDefinition } from '@flue/runtime';
import { Effect, Schema } from 'effect';

import { retryTransientRead, runToolEffect } from '../shared.ts';
import {
	createCategoryParameters,
	deleteCategoryParameters,
	getCategoryParameters,
	listCategoriesParameters,
	updateCategoryParameters,
} from './schemas.ts';

interface CategoryLookup {
	readonly id?: string;
	readonly slug?: string;
}

function slugifyCategoryName(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function categorySlugForCreate(name: string, slug?: string) {
	return slug?.trim() || slugifyCategoryName(name);
}

const decodeUserId = Schema.decodeUnknownEffect(UserId);

export const resolveCategory = Effect.fn('AgentTools.resolveCategory')(
	function* (userId: UserId, input: CategoryLookup) {
		const categories = yield* CategoriesRepo;

		if (input.id) {
			const categoryId = yield* Schema.decodeUnknownEffect(CategoryId)(
				input.id
			);
			return yield* retryTransientRead(categories.getById(userId, categoryId));
		}

		if (input.slug) {
			const slug = yield* Schema.decodeUnknownEffect(Category.fields.slug)(
				input.slug
			);
			return yield* retryTransientRead(categories.getBySlug(userId, slug));
		}

		return yield* Effect.fail(
			CategoryNotFound.make({ identifier: 'category id or slug' })
		);
	}
);

export function categoryTools(userId: string): ToolDefinition[] {
	const listCategoriesTool = defineTool({
		description:
			'List the available expense categories. Use this before creating or updating an expense when you need a valid category.',
		input: listCategoriesParameters,
		name: 'list_categories',
		run: ({ signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const parsedUserId = yield* decodeUserId(userId);
					const categories = yield* CategoriesRepo;
					const listed = yield* retryTransientRead(
						categories.list(parsedUserId)
					);
					return JSON.stringify({ categories: listed });
				}),
				signal
			),
	});

	const getCategoryTool = defineTool({
		description: 'Get one expense category by id or slug.',
		input: getCategoryParameters,
		name: 'get_category',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const parsedUserId = yield* decodeUserId(userId);
					const category = yield* resolveCategory(parsedUserId, input);
					return JSON.stringify({ category });
				}),
				signal
			),
	});

	const createCategoryTool = defineTool({
		description:
			'Create a new expense category after the category name is clear. If slug is omitted, it is generated from the name.',
		input: createCategoryParameters,
		name: 'create_category',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const parsedUserId = yield* decodeUserId(userId);
					const values = yield* Schema.decodeUnknownEffect(CreateCategoryInput)(
						{
							name: input.name,
							slug: categorySlugForCreate(input.name, input.slug),
						}
					);
					const categories = yield* CategoriesRepo;
					const category = yield* categories.create(parsedUserId, values);
					return JSON.stringify({ category });
				}),
				signal
			),
	});

	const updateCategoryTool = defineTool({
		description:
			'Update an expense category by id or slug after the requested name or slug change is clear.',
		input: updateCategoryParameters,
		name: 'update_category',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const parsedUserId = yield* decodeUserId(userId);
					const existing = yield* resolveCategory(parsedUserId, input);
					const rawValues: { name?: string; slug?: string } = {};
					if (input.name !== undefined) {
						rawValues.name = input.name;
					}
					if (input.newSlug !== undefined) {
						rawValues.slug = input.newSlug;
					}
					if (Object.keys(rawValues).length === 0) {
						return yield* Effect.fail(EmptyUpdate.make({ entity: 'category' }));
					}
					const values =
						yield* Schema.decodeUnknownEffect(UpdateCategoryInput)(rawValues);
					const categories = yield* CategoriesRepo;
					const category = yield* categories.update(
						parsedUserId,
						existing.id,
						values
					);
					return JSON.stringify({ category });
				}),
				signal
			),
	});

	const deleteCategoryTool = defineTool({
		description:
			'Delete an expense category by id or slug only after user confirmation. Existing expenses in this category become uncategorized.',
		input: deleteCategoryParameters,
		name: 'delete_category',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const parsedUserId = yield* decodeUserId(userId);
					const existing = yield* resolveCategory(parsedUserId, input);
					const categories = yield* CategoriesRepo;
					const category = yield* categories.delete(parsedUserId, existing.id);
					return JSON.stringify({ deletedCategory: category });
				}),
				signal
			),
	});

	return [
		listCategoriesTool,
		getCategoryTool,
		createCategoryTool,
		updateCategoryTool,
		deleteCategoryTool,
	];
}
