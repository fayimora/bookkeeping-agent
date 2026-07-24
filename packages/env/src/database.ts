import { Config } from 'effect';

/** Shared server-side database configuration recipes. */
export const DatabaseConfig = {
	url: Config.redacted('DATABASE_URL'),
};
