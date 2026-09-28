import {
	type Category,
	type CategoryId,
	CategoryNotFound,
	Category as CategorySchema,
	type CreateCategoryInput,
	EmptyUpdate,
	type UpdateCategoryInput,
	type UserId,
} from '@bookeeping-agent/domain';
import { and, asc, eq } from 'drizzle-orm';
import { Context, Effect, Layer, Schema } from 'effect';

import { Database } from '#db/database';
import { type DbError, dbError, missingRow } from '#db/errors';
import { categories } from '#db/schema';

/** Identifies one of a user's categories by id or slug in a single statement. */
export type CategoryRef =
	| { readonly id: CategoryId }
	| { readonly slug: string };

export interface CategoriesRepoService {
	readonly create: (
		userId: UserId,
		input: CreateCategoryInput
	) => Effect.Effect<Category, DbError>;
	readonly delete: (
		userId: UserId,
		ref: CategoryRef
	) => Effect.Effect<Category, CategoryNotFound | DbError>;
	readonly getById: (
		userId: UserId,
		categoryId: CategoryId
	) => Effect.Effect<Category, CategoryNotFound | DbError>;
	readonly getBySlug: (
		userId: UserId,
		slug: string
	) => Effect.Effect<Category, CategoryNotFound | DbError>;
	readonly list: (
		userId: UserId
	) => Effect.Effect<readonly Category[], DbError>;
	readonly update: (
		userId: UserId,
		ref: CategoryRef,
		input: UpdateCategoryInput
	) => Effect.Effect<Category, CategoryNotFound | DbError | EmptyUpdate>;
}

export class CategoriesRepo extends Context.Service<
	CategoriesRepo,
	CategoriesRepoService
>()('@bookeeping-agent/db/CategoriesRepo') {}

const decodeCategories = (operation: string, rows: unknown) =>
	Schema.decodeUnknownEffect(Schema.Array(CategorySchema))(rows).pipe(
		dbError(operation)
	);

const decodeCategory = (operation: string, row: unknown) =>
	Schema.decodeUnknownEffect(CategorySchema)(row).pipe(dbError(operation));

const requiredCategory = (
	operation: string,
	identifier: string,
	rows: readonly unknown[]
) => {
	const [row] = rows;
	return row === undefined
		? Effect.fail(CategoryNotFound.make({ identifier }))
		: decodeCategory(operation, row);
};

const refIdentifier = (ref: CategoryRef) => ('id' in ref ? ref.id : ref.slug);

const ownedCategory = (userId: UserId, ref: CategoryRef) =>
	and(
		'id' in ref ? eq(categories.id, ref.id) : eq(categories.slug, ref.slug),
		eq(categories.userId, userId)
	);

export const CategoriesRepoLive = Layer.effect(
	CategoriesRepo,
	Effect.gen(function* () {
		const db = yield* Database;

		const list = Effect.fn('CategoriesRepo.list')(function* (userId: UserId) {
			const rows = yield* db
				.select()
				.from(categories)
				.where(eq(categories.userId, userId))
				.orderBy(asc(categories.name))
				.pipe(dbError('CategoriesRepo.list.query'));

			return yield* decodeCategories('CategoriesRepo.list.decode', rows);
		});

		const getById = Effect.fn('CategoriesRepo.getById')(function* (
			userId: UserId,
			categoryId: CategoryId
		) {
			const rows = yield* db
				.select()
				.from(categories)
				.where(
					and(eq(categories.id, categoryId), eq(categories.userId, userId))
				)
				.limit(1)
				.pipe(dbError('CategoriesRepo.getById.query'));

			return yield* requiredCategory(
				'CategoriesRepo.getById.decode',
				categoryId,
				rows
			);
		});

		const getBySlug = Effect.fn('CategoriesRepo.getBySlug')(function* (
			userId: UserId,
			slug: string
		) {
			const rows = yield* db
				.select()
				.from(categories)
				.where(and(eq(categories.slug, slug), eq(categories.userId, userId)))
				.limit(1)
				.pipe(dbError('CategoriesRepo.getBySlug.query'));

			return yield* requiredCategory(
				'CategoriesRepo.getBySlug.decode',
				slug,
				rows
			);
		});

		const create = Effect.fn('CategoriesRepo.create')(function* (
			userId: UserId,
			input: CreateCategoryInput
		) {
			const rows = yield* db
				.insert(categories)
				.values({ ...input, userId })
				.returning()
				.pipe(dbError('CategoriesRepo.create.insert'));
			const [row] = rows;
			if (row === undefined) {
				return yield* Effect.fail(missingRow('CategoriesRepo.create.insert'));
			}

			return yield* decodeCategory('CategoriesRepo.create.decode', row);
		});

		const update = Effect.fn('CategoriesRepo.update')(function* (
			userId: UserId,
			ref: CategoryRef,
			input: UpdateCategoryInput
		) {
			if (Object.keys(input).length === 0) {
				return yield* Effect.fail(EmptyUpdate.make({ entity: 'category' }));
			}

			const rows = yield* db
				.update(categories)
				.set({ ...input, updatedAt: new Date() })
				.where(ownedCategory(userId, ref))
				.returning()
				.pipe(dbError('CategoriesRepo.update.query'));

			return yield* requiredCategory(
				'CategoriesRepo.update.decode',
				refIdentifier(ref),
				rows
			);
		});

		const deleteCategory = Effect.fn('CategoriesRepo.delete')(function* (
			userId: UserId,
			ref: CategoryRef
		) {
			const rows = yield* db
				.delete(categories)
				.where(ownedCategory(userId, ref))
				.returning()
				.pipe(dbError('CategoriesRepo.delete.query'));

			return yield* requiredCategory(
				'CategoriesRepo.delete.decode',
				refIdentifier(ref),
				rows
			);
		});

		return CategoriesRepo.of({
			create,
			delete: deleteCategory,
			getById,
			getBySlug,
			list,
			update,
		});
	})
);
