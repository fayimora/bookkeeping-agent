import type { listCategories } from '../../server/categories';

export type Category = Awaited<ReturnType<typeof listCategories>>[number];

export interface CategoryFormValues {
	name: string;
	slug: string;
}

export const emptyCategoryFormValues = (): CategoryFormValues => ({
	name: '',
	slug: '',
});
