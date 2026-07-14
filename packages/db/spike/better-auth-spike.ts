/**
 * Chunk 0 spike — throwaway.
 *
 * GO/NO-GO check: does @better-auth/drizzle-adapter (peer range ^0.45.2,
 * overridden to drizzle-orm@1.0.0-rc.4) work against a drizzle v1 db
 * instance at runtime? Exercises the full email/password sign-in flow:
 * users + accounts reads, session insert, then getSession + sign-out.
 */
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';

import { db } from '../src';
import { schema } from '../src/schema';

const auth = betterAuth({
	baseURL: 'http://localhost:3000',
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema,
		usePlural: true,
	}),
	emailAndPassword: {
		disableSignUp: true,
		enabled: true,
	},
	secret: 'chunk0-spike-secret',
	trustedOrigins: ['http://localhost:3000'],
});

const signIn = await auth.api.signInEmail({
	body: {
		email: 'alice@bookkeeping.local',
		password: 'alicepassword',
	},
	returnHeaders: true,
});

console.log('sign-in ok:', {
	token: `${signIn.response.token?.slice(0, 8)}…`,
	user: signIn.response.user.email,
});

const cookie = signIn.headers.get('set-cookie');
if (!cookie) {
	throw new Error('no session cookie returned');
}

const session = await auth.api.getSession({
	headers: new Headers({ cookie }),
});
if (!session) {
	throw new Error('getSession returned null — session read failed');
}
console.log('getSession ok:', {
	expiresAt: session.session.expiresAt,
	user: session.user.email,
});

await auth.api.signOut({ headers: new Headers({ cookie }) });
console.log('sign-out ok (session row deleted)');
console.log('better-auth × drizzle v1 RC: GO');
