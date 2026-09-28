import { createRouter as createTanStackRouter } from '@tanstack/react-router';

import Loader from './components/loader';
import { makeQueryClient } from './providers/query-provider';
import { routeTree } from './routeTree.gen';

export const getRouter = () => {
	const router = createTanStackRouter({
		context: { queryClient: makeQueryClient() },
		defaultNotFoundComponent: () => <div>Not Found</div>,
		defaultPendingComponent: () => <Loader />,
		defaultPreloadStaleTime: 0,
		routeTree,
		scrollRestoration: true,
	});

	return router;
};

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
