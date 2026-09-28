import {
	description,
	maxLength,
	minLength,
	object,
	optional,
	pipe,
	string,
} from 'valibot';

const categoryIdParameter = pipe(
	string(),
	description('Category UUID.'),
	minLength(1)
);

const categorySlugParameter = pipe(
	string(),
	description('Category slug, such as food or travel.'),
	minLength(1),
	maxLength(100)
);

const categoryNameParameter = pipe(
	string(),
	description('Category display name.'),
	minLength(1),
	maxLength(100)
);

export const listCategoriesParameters = object({});

export const getCategoryParameters = object({
	id: optional(categoryIdParameter),
	slug: optional(categorySlugParameter),
});

export const createCategoryParameters = object({
	name: categoryNameParameter,
	slug: optional(categorySlugParameter),
});

export const updateCategoryParameters = object({
	id: optional(categoryIdParameter),
	name: optional(categoryNameParameter),
	newSlug: optional(
		pipe(
			string(),
			description('New category slug to save.'),
			minLength(1),
			maxLength(100)
		)
	),
	slug: optional(categorySlugParameter),
});

export const deleteCategoryParameters = object({
	id: optional(categoryIdParameter),
	slug: optional(categorySlugParameter),
});
