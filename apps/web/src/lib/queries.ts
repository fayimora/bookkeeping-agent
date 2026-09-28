import { queryOptions } from '@tanstack/react-query';

import { listCategories } from '../server/categories';
import { listConversations } from '../server/conversations';
import { listExpenses } from '../server/expenses';

// Shared so route loaders, components and invalidations hit the same cache entries.

export const conversationsQueryOptions = queryOptions({
	queryFn: async () => await listConversations(),
	queryKey: ['conversations'],
});

export const categoriesQueryOptions = queryOptions({
	queryFn: async () => await listCategories(),
	queryKey: ['categories'],
});

export const expensesQueryOptions = queryOptions({
	queryFn: async () => await listExpenses({ data: {} }),
	queryKey: ['expenses'],
});
