import { Config } from 'effect';

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
