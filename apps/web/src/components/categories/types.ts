import type { ServerResultData } from '../../lib/result';
import type { listCategories } from '../../server/categories';

export type Category = ServerResultData<typeof listCategories>[number];

export interface CategoryFormValues {
	name: string;
	slug: string;
}

export const emptyCategoryFormValues = (): CategoryFormValues => ({
	name: '',
	slug: '',
});
