import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		CORS_ORIGIN: z.url(),
		AGENT_MODEL: z
			.string()
			.min(1)
			.default('fireworks/accounts/fireworks/models/kimi-k2p6'),
		NODE_ENV: z
			.enum(['development', 'production', 'test'])
			.default('development'),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
