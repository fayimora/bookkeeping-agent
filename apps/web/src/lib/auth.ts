import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '@bookeeping-agent/db';
import { schema } from '@bookeeping-agent/db/schema/index';
import { env } from '@bookeeping-agent/env/server';
import { betterAuth } from 'better-auth';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

export const auth = betterAuth({
	baseURL: env.CORS_ORIGIN,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema,
		usePlural: true,
	}),
	emailAndPassword: {
		disableSignUp: true,
		enabled: true,
	},
	plugins: [tanstackStartCookies()],
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: [env.CORS_ORIGIN],
});
