import { categorySlugForCreate } from '@bookeeping-agent/domain/formatting';

import type { CategoryFormValues } from './types';

export function toCategoryInput(values: CategoryFormValues) {
	return {
		name: values.name,
		slug: categorySlugForCreate(values.name, values.slug),
	};
}
