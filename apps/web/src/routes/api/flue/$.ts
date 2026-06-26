import { env } from '@bookeeping-agent/env/server';
import { createFileRoute } from '@tanstack/react-router';
import { proxy } from 'hono/proxy';

import { auth } from '../../../lib/auth';

/**
 * Streaming reverse proxy for the Flue agent API.
 *
 * The browser talks to `@flue/react` through this route (the SDK client is
 * configured with `baseUrl: '/api/flue'`). This route is the trust boundary:
 *
 *   1. It authenticates the better-auth session.
 *   2. It pins the agent instance id to the authenticated user, so a caller
 *      can never select another user's `bookkeeper` instance.
 *   3. It injects the server-only `FLUE_TOKEN` and forwards to `FLUE_BASE_URL`,
 *      streaming the response body straight back (Durable Streams long-poll
 *      and SSE both pass through unbuffered).
 *
 * `@flue/react` only ever calls `POST/GET /agents/bookkeeper/:id`, so that is
 * the only shape this proxy admits.
 */

const AGENT_NAME = 'bookkeeper';
const MOUNT_PREFIX = '/api/flue';
const TRAILING_SLASHES = /\/+$/;

function flueBaseUrl() {
	return env.FLUE_BASE_URL.replace(TRAILING_SLASHES, '');
}

async function proxyToFlue(request: Request): Promise<Response> {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	const url = new URL(request.url);
	const subPath = url.pathname.slice(MOUNT_PREFIX.length);
	const segments = subPath.split('/').filter(Boolean);

	// Only `/agents/bookkeeper/<userId>` is allowed, pinned to the session user.
	const isAgentPath =
		segments.length === 3 &&
		segments[0] === 'agents' &&
		segments[1] === AGENT_NAME &&
		decodeURIComponent(segments[2]) === session.user.id;

	if (!isAgentPath) {
		return new Response('Forbidden', { status: 403 });
	}

	const targetUrl = `${flueBaseUrl()}${subPath}${url.search}`;

	// `hono/proxy` handles hop-by-hop header stripping, accept/content-encoding
	// normalization, and request-body streaming; we only override the headers we
	// care about (drop the inbound host, inject the server-only Flue token).
	const response = await proxy(targetUrl, {
		raw: request,
		headers: {
			...Object.fromEntries(request.headers),
			host: undefined,
			authorization: env.FLUE_TOKEN ? `Bearer ${env.FLUE_TOKEN}` : undefined,
		},
	});

	// Disable proxy buffering so the Durable Streams long-poll / SSE flows live.
	response.headers.set('x-accel-buffering', 'no');
	return response;
}

export const Route = createFileRoute('/api/flue/$')({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) =>
				await proxyToFlue(request),
			POST: async ({ request }: { request: Request }) =>
				await proxyToFlue(request),
		},
	},
});
