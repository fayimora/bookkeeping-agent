import { FlueProvider } from '@flue/react';
import { createFlueClient } from '@flue/sdk';
import { useState } from 'react';

function createBrowserFlueClient() {
	// In the browser, the relative baseUrl resolves against the page origin and
	// routes every agent request through the `/api/flue` auth proxy. During SSR
	// there is no origin and the Flue hooks open no connections, so a placeholder
	// absolute URL just keeps client construction from throwing.
	const baseUrl =
		typeof window === 'undefined' ? 'http://localhost/api/flue' : '/api/flue';

	// The SDK stores `globalThis.fetch` unbound and calls it as a method, which
	// throws "Illegal invocation" in the browser. Pass an explicitly bound fetch.
	const fetchImpl =
		typeof globalThis.fetch === 'function'
			? globalThis.fetch.bind(globalThis)
			: undefined;

	return createFlueClient({ baseUrl, fetch: fetchImpl });
}

export function FlueClientProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [client] = useState(createBrowserFlueClient);

	return <FlueProvider client={client}>{children}</FlueProvider>;
}
