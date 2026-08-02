import { Config } from 'effect';

const defaultAgentModel = 'openrouter/openai/gpt-5.6-luna';

/** Agent-process configuration recipes for Effect application code. */
export const AgentConfig = {
	model: Config.nonEmptyString('AGENT_MODEL').pipe(
		Config.withDefault(defaultAgentModel)
	),
	observability: Config.literals(
		['off', 'summary', 'verbose'],
		'AGENT_OBSERVABILITY'
	).pipe(Config.withDefault('summary')),
	telemetryIncludeContent: Config.boolean(
		'AGENT_TELEMETRY_INCLUDE_CONTENT'
	).pipe(Config.withDefault(false)),
};
