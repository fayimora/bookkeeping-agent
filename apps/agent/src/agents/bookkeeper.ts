import { env } from '@bookeeping-agent/env/server';
import { type AgentRouteHandler, defineAgent } from '@flue/runtime';
import { bookkeeperInstructions } from '../instructions/bookkeeper.ts';
import { registerAgentObservability } from '../observability.ts';
import receiptEntry from '../skills/receipt-entry/SKILL.md' with {
	type: 'skill',
};
import spendAnalysis from '../skills/spend-analysis/SKILL.md' with {
	type: 'skill',
};
import { bookkeeperTools } from '../tools/bookkeeper-tools.ts';

registerAgentObservability();

export const description =
	'Personal bookkeeping assistant for expenses and receipts.';

export const route: AgentRouteHandler = async (_context, next) => {
	await next();
};

// The Flue agent instance id is a composite `${userId}::${conversationId}` so
// each chat thread gets its own isolated session/memory. Parse the userId back
// out to keep expense/category tools scoped to the user. A plain id (no `::`)
// falls back to the whole string for backwards compatibility.
export default defineAgent(({ id: instanceId }) => {
	const userId = instanceId.split('::')[0] ?? instanceId;

	return {
		instructions: bookkeeperInstructions,
		model: env.AGENT_MODEL,
		skills: [spendAnalysis, receiptEntry],
		tools: bookkeeperTools(userId),
	};
});
