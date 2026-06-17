import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		CORS_ORIGIN: z.url(),
		AGENT_MODEL: z.string().min(1).default('openrouter/moonshotai/kimi-k2.6'),
		FLUE_BASE_URL: z.url().default('http://localhost:3583'),
		FLUE_TOKEN: z.string().min(1).optional(),
		NODE_ENV: z
			.enum(['development', 'production', 'test'])
			.default('development'),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
