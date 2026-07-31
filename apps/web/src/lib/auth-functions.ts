import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { Effect } from 'effect';

import { BetterAuth } from '../server/auth';
import { runWebEffect } from '../server/http';

export const getSession = createServerFn({ method: 'GET' }).handler(() => {
	const headers = getRequestHeaders();
	return runWebEffect(
		Effect.gen(function* () {
			const auth = yield* BetterAuth;
			return yield* auth.getSession(headers);
		})
	);
});
