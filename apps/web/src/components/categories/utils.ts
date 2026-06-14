import type { CategoryFormValues } from './types';

export function slugifyCategoryName(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function toCategoryInput(values: CategoryFormValues) {
	return {
		name: values.name,
		slug: values.slug || slugifyCategoryName(values.name),
	};
}
