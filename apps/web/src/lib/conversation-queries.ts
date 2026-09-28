import { queryOptions } from '@tanstack/react-query';

import { listConversations } from '../server/conversations';

/** Shared so route loaders and the sidebar hit the same cache entry. */
export const conversationsQueryOptions = queryOptions({
	queryFn: async () => await listConversations(),
	queryKey: ['conversations'],
});
