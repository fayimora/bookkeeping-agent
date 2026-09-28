import { getSession } from './auth-functions';

type Session = Awaited<ReturnType<typeof getSession>>;

// Client navigations reuse the session briefly instead of re-fetching it in
// every beforeLoad. Server data calls still authenticate every request, so a
// revoked session only lingers in the header/redirect checks for this window.
const clientSessionTtlMs = 60_000;

let cached: { expiresAt: number; session: Promise<Session> } | undefined;

export function loadSession(): Promise<Session> {
	// Never share across requests on the server.
	if (typeof window === 'undefined') {
		return getSession();
	}

	if (cached === undefined || cached.expiresAt <= Date.now()) {
		const session = getSession().catch((error: unknown) => {
			cached = undefined;
			throw error;
		});
		cached = { expiresAt: Date.now() + clientSessionTtlMs, session };
	}

	return cached.session;
}

/** Call after sign-in/sign-out so the next navigation re-resolves the session. */
export function clearSessionCache() {
	cached = undefined;
}
