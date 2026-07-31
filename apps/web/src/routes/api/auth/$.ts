import { createFileRoute } from '@tanstack/react-router';
import { Effect } from 'effect';

import { BetterAuth } from '../../../server/auth';
import { runWebEffect } from '../../../server/http';

const handleAuthRequest = (request: Request) =>
	runWebEffect(
		Effect.gen(function* () {
			const auth = yield* BetterAuth;
			return yield* auth.handler(request);
		})
	);

export const Route = createFileRoute('/api/auth/$')({
	server: {
		handlers: {
			GET: ({ request }: { request: Request }) => handleAuthRequest(request),
			POST: ({ request }: { request: Request }) => handleAuthRequest(request),
		},
	},
});
