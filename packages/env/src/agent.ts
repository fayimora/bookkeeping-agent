import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
	emptyStringAsUndefined: true,
	runtimeEnv: process.env,
	server: {
		AGENT_MODEL: z.string().min(1).default('openrouter/moonshotai/kimi-k2.6'),
		AGENT_OBSERVABILITY: z
			.enum(['off', 'summary', 'verbose'])
			.default('summary'),
		DATABASE_URL: z.string().min(1),
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
