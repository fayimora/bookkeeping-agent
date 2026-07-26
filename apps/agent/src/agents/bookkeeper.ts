import { AgentConfig } from '@bookeeping-agent/env/agent';
import { type AgentRouteHandler, defineAgent } from '@flue/runtime';
import { Effect } from 'effect';
import { bookkeeperInstructions } from '../instructions/bookkeeper.ts';
import { registerAgentObservability } from '../observability.ts';
import { agentRuntime } from '../runtime.ts';
import receiptEntry from '../skills/receipt-entry/SKILL.md' with {
	type: 'skill',
};
import spendAnalysis from '../skills/spend-analysis/SKILL.md' with {
	type: 'skill',
};
import { bookkeeperTools } from '../tools/bookkeeper-tools.ts';

export const description =
	'Personal bookkeeping assistant for expenses and receipts.';

export const route: AgentRouteHandler = async (_context, next) => {
	await next();
};

// The Flue agent instance id is a composite `${userId}::${conversationId}` so
// each chat thread gets its own isolated session/memory. Parse the userId back
// out to keep expense/category tools scoped to the user. A plain id (no `::`)
// falls back to the whole string for backwards compatibility.
const loadAgentConfig = Effect.fn('AgentConfig.load')(function* () {
	return {
		model: yield* AgentConfig.model,
		observability: yield* AgentConfig.observability,
	};
});

let agentConfigPromise:
	| Promise<{
			readonly model: string;
			readonly observability: 'off' | 'summary' | 'verbose';
	  }>
	| undefined;

function getAgentConfig() {
	agentConfigPromise ??= agentRuntime.runPromise(loadAgentConfig());
	return agentConfigPromise;
}

export default defineAgent(async ({ id: instanceId }) => {
	const config = await getAgentConfig();
	registerAgentObservability(config.observability);
	const userId = instanceId.split('::')[0] ?? instanceId;

	return {
		instructions: bookkeeperInstructions,
		model: config.model,
		skills: [spendAnalysis, receiptEntry],
		tools: bookkeeperTools(userId),
	};
});
