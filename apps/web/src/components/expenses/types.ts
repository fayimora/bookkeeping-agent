import type { ServerResultData } from '../../lib/result';
import type { listCategories } from '../../server/categories';
import type { listExpenses } from '../../server/expenses';

export type Expense = ServerResultData<typeof listExpenses>[number];
export type Category = ServerResultData<typeof listCategories>[number];

export interface ExpenseFormValues {
	amount: string;
	categoryId: string;
	currency: string;
	date: string;
	description: string;
	vendor: string;
}

export const NO_CATEGORY_VALUE = 'none';

export const emptyFormValues = (): ExpenseFormValues => ({
	amount: '',
	categoryId: NO_CATEGORY_VALUE,
	currency: 'GBP',
	date: new Date().toISOString().slice(0, 10),
	description: '',
	vendor: '',
});
