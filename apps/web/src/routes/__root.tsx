import { Toaster } from '@bookeeping-agent/ui/components/sonner';
import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import Header from '../components/header';
import appCss from '../index.css?url';
import { loadSession } from '../lib/session-cache';
import { QueryProvider } from '../providers/query-provider';

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
}>()({
	beforeLoad: async () => ({ session: await loadSession() }),
	component: RootDocument,
	head: () => ({
		links: [
			{
				href: appCss,
				rel: 'stylesheet',
			},
		],
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				content: 'width=device-width, initial-scale=1',
				name: 'viewport',
			},
			{
				title: 'My App',
			},
		],
	}),
});

function RootDocument() {
	const { queryClient } = Route.useRouteContext();
	return (
		<html className="dark" lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<QueryProvider client={queryClient}>
					<div className="grid h-svh grid-rows-[auto_1fr]">
						<Header />
						<Outlet />
					</div>
					<Toaster richColors />
					{import.meta.env.DEV ? (
						<TanStackDevtools
							plugins={[
								{
									id: 'tanstack-query',
									name: 'TanStack Query',
									render: <ReactQueryDevtoolsPanel />,
								},
								{
									id: 'tanstack-router',
									name: 'TanStack Router',
									render: <TanStackRouterDevtoolsPanel />,
								},
							]}
						/>
					) : null}
				</QueryProvider>
				<Scripts />
			</body>
		</html>
	);
}
