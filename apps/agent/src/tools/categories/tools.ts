import { CategoriesRepo, type CategoryRef } from '@bookeeping-agent/db';
import {
	Category,
	CategoryId,
	CategoryNotFound,
	CreateCategoryInput,
	categorySlugForCreate,
	UpdateCategoryInput,
	type UserId,
} from '@bookeeping-agent/domain';
import { defineTool, type ToolDefinition } from '@flue/runtime';
import { Effect, Schema } from 'effect';

import { omitUndefined, retryTransientRead, runToolEffect } from '../shared';
import {
	createCategoryParameters,
	deleteCategoryParameters,
	getCategoryParameters,
	listCategoriesParameters,
	updateCategoryParameters,
} from './schemas';

interface CategoryLookup {
	readonly id?: string;
	readonly slug?: string;
}

const categoryRef = Effect.fn('AgentTools.categoryRef')(function* (
	input: CategoryLookup
) {
	if (input.id) {
		const ref: CategoryRef = {
			id: yield* Schema.decodeUnknownEffect(CategoryId)(input.id),
		};
		return ref;
	}

	if (input.slug) {
		const ref: CategoryRef = {
			slug: yield* Schema.decodeUnknownEffect(Category.fields.slug)(input.slug),
		};
		return ref;
	}

	return yield* Effect.fail(
		CategoryNotFound.make({ identifier: 'category id or slug' })
	);
});

export const resolveCategory = Effect.fn('AgentTools.resolveCategory')(
	function* (userId: UserId, input: CategoryLookup) {
		const ref = yield* categoryRef(input);
		const categories = yield* CategoriesRepo;
		return yield* retryTransientRead(
			'id' in ref
				? categories.getById(userId, ref.id)
				: categories.getBySlug(userId, ref.slug)
		);
	}
);

export function categoryTools(userId: UserId): ToolDefinition[] {
	const listCategoriesTool = defineTool({
		description:
			'List expense categories. Use before creating or updating an expense when a valid category is needed.',
		input: listCategoriesParameters,
		name: 'list_categories',
		run: ({ signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const categories = yield* CategoriesRepo;
					const listed = yield* retryTransientRead(categories.list(userId));
					return JSON.stringify({ categories: listed });
				}),
				signal
			),
	});

	const getCategoryTool = defineTool({
		description: 'Get one category by id or slug.',
		input: getCategoryParameters,
		name: 'get_category',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const category = yield* resolveCategory(userId, input);
					return JSON.stringify({ category });
				}),
				signal
			),
	});

	const createCategoryTool = defineTool({
		description:
			'Create a category after its name is clear. Generate the slug when omitted.',
		input: createCategoryParameters,
		name: 'create_category',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const values = yield* Schema.decodeUnknownEffect(CreateCategoryInput)(
						{
							name: input.name,
							slug: categorySlugForCreate(input.name, input.slug),
						}
					);
					const categories = yield* CategoriesRepo;
					const category = yield* categories.create(userId, values);
					return JSON.stringify({ category });
				}),
				signal
			),
	});

	const updateCategoryTool = defineTool({
		description:
			'Update a category by id or slug after the requested change is clear.',
		input: updateCategoryParameters,
		name: 'update_category',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const ref = yield* categoryRef(input);
					const values = yield* Schema.decodeUnknownEffect(UpdateCategoryInput)(
						omitUndefined({ name: input.name, slug: input.newSlug })
					);
					const categories = yield* CategoriesRepo;
					const category = yield* categories.update(userId, ref, values);
					return JSON.stringify({ category });
				}),
				signal
			),
	});

	const deleteCategoryTool = defineTool({
		description:
			'Delete a category by id or slug only after confirmation. Existing expenses become uncategorized.',
		input: deleteCategoryParameters,
		name: 'delete_category',
		run: ({ data: input, signal }) =>
			runToolEffect(
				Effect.gen(function* () {
					const ref = yield* categoryRef(input);
					const categories = yield* CategoriesRepo;
					const category = yield* categories.delete(userId, ref);
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
