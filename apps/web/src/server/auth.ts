import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { relations } from '@bookeeping-agent/db/relations';
import { schema } from '@bookeeping-agent/db/schema/index';
import type { UserId } from '@bookeeping-agent/domain';
import { DatabaseConfig } from '@bookeeping-agent/env/database';
import { WebServerConfig } from '@bookeeping-agent/env/web-server';
import { betterAuth, type Session, type User } from 'better-auth';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Context, Effect, Layer, Redacted, Schema } from 'effect';
import { Pool } from 'pg';

export class Unauthorized extends Schema.TaggedErrorClass<Unauthorized>()(
	'Unauthorized',
	{}
) {}

export class BetterAuthError extends Schema.TaggedErrorClass<BetterAuthError>()(
	'BetterAuthError',
	{
		cause: Schema.Defect(),
		operation: Schema.String,
	}
) {}

export interface AuthSession {
	readonly session: Session;
	readonly user: User;
}

export interface BetterAuthService {
	readonly getSession: (
		headers: Headers
	) => Effect.Effect<AuthSession | null, BetterAuthError>;
	readonly handler: (
		request: Request
	) => Effect.Effect<Response, BetterAuthError>;
}

export class BetterAuth extends Context.Service<
	BetterAuth,
	BetterAuthService
>()('@bookeeping-agent/web/BetterAuth') {}

export interface CurrentUserService {
	readonly id: UserId;
}

export class CurrentUser extends Context.Service<
	CurrentUser,
	CurrentUserService
>()('@bookeeping-agent/web/CurrentUser') {}

export const BetterAuthLive = Layer.effect(
	BetterAuth,
	Effect.gen(function* () {
		const databaseUrl = yield* DatabaseConfig.url;
		const betterAuthSecret = yield* WebServerConfig.betterAuthSecret;
		const corsOrigin = yield* WebServerConfig.corsOrigin;
		const pool = yield* Effect.acquireRelease(
			Effect.sync(
				() =>
					new Pool({
						connectionString: Redacted.value(databaseUrl),
					})
			),
			(poolToClose) => Effect.promise(() => poolToClose.end())
		);
		const database = drizzle({ client: pool, relations });
		const auth = betterAuth({
			baseURL: corsOrigin.origin,
			database: drizzleAdapter(database, {
				provider: 'pg',
				schema,
				usePlural: true,
			}),
			emailAndPassword: {
				disableSignUp: true,
				enabled: true,
			},
			plugins: [tanstackStartCookies()],
			secret: Redacted.value(betterAuthSecret),
			trustedOrigins: [corsOrigin.origin],
		});

		const getSession = Effect.fn('BetterAuth.getSession')((headers: Headers) =>
			Effect.tryPromise({
				catch: (cause) =>
					BetterAuthError.make({ cause, operation: 'BetterAuth.getSession' }),
				try: () => auth.api.getSession({ headers }),
			})
		);
		const handler = Effect.fn('BetterAuth.handler')((request: Request) =>
			Effect.tryPromise({
				catch: (cause) =>
					BetterAuthError.make({ cause, operation: 'BetterAuth.handler' }),
				try: () => auth.handler(request),
			})
		);

		return BetterAuth.of({ getSession, handler });
	})
);
