import { Toaster } from '@bookeeping-agent/ui/components/sonner';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import Header from '../components/header';
import appCss from '../index.css?url';
import { QueryProvider } from '../providers/query-provider';

export const Route = createRootRoute({
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
	return (
		<html className="dark" lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<QueryProvider>
					<div className="grid h-svh grid-rows-[auto_1fr]">
						<Header />
						<Outlet />
					</div>
					<Toaster richColors />
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
				</QueryProvider>
				<Scripts />
			</body>
		</html>
	);
}
