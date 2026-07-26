import { createEnv } from '@t3-oss/env-core';
import { Config } from 'effect';
import { z } from 'zod';

const defaultAgentModel = 'openrouter/moonshotai/kimi-k2.6';

/** Agent-process configuration recipes for Effect application code. */
export const AgentConfig = {
	model: Config.nonEmptyString('AGENT_MODEL').pipe(
		Config.withDefault(defaultAgentModel)
	),
	observability: Config.literals(
		['off', 'summary', 'verbose'],
		'AGENT_OBSERVABILITY'
	).pipe(Config.withDefault('summary')),
};

export const env = createEnv({
	emptyStringAsUndefined: true,
	runtimeEnv: process.env,
	server: {
		DATABASE_URL: z.string().min(1),
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
