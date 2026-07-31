import { Config, Schema } from 'effect';

const BetterAuthSecret = Schema.Redacted(
	Schema.String.check(Schema.isMinLength(32))
);
const FlueToken = Schema.Redacted(Schema.NonEmptyString);

/** Web-server-process configuration recipes for Effect application code. */
export const WebServerConfig = {
	betterAuthSecret: Config.schema(BetterAuthSecret, 'BETTER_AUTH_SECRET'),
	corsOrigin: Config.url('CORS_ORIGIN'),
	flueBaseUrl: Config.url('FLUE_BASE_URL').pipe(
		Config.withDefault(new URL('http://localhost:3583'))
	),
	flueToken: Config.option(Config.schema(FlueToken, 'FLUE_TOKEN')),
};
