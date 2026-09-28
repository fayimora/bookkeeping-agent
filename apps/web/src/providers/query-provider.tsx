import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// getRouter() runs once per request on the server and once on the client, so
// creating the client there keeps SSR caches request-scoped.
export function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5000,
			},
		},
	});
}

export function QueryProvider({
	children,
	client,
}: {
	children: React.ReactNode;
	client: QueryClient;
}) {
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
