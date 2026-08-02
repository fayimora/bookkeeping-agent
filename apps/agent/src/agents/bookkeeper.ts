'use agent';

import { AgentConfig } from '@bookeeping-agent/env/agent';
import { type AgentProps, useModel, useSkill, useTool } from '@flue/runtime';
import { Effect } from 'effect';

import { bookkeeperInstructions } from '../instructions/bookkeeper';
import { registerAgentObservability } from '../observability';
import receiptEntry from '../skills/receipt-entry/SKILL.md';
import spendAnalysis from '../skills/spend-analysis/SKILL.md';
import { bookkeeperTools } from '../tools/bookkeeper-tools';

const agentConfig = Effect.runSync(
	Effect.all({
		model: AgentConfig.model,
		observability: AgentConfig.observability,
	})
);

registerAgentObservability(agentConfig.observability);

// The Flue agent instance id is a composite `${userId}::${conversationId}` so
// each chat thread gets its own isolated session/memory. Parse the userId back
// out to keep expense/category tools scoped to the user. A plain id (no `::`)
// falls back to the whole string for backwards compatibility.
export function Bookkeeper({ id: instanceId }: AgentProps) {
	const userId = instanceId.split('::')[0] ?? instanceId;

	useModel(agentConfig.model);
	useSkill(spendAnalysis);
	useSkill(receiptEntry);
	for (const tool of bookkeeperTools(userId)) {
		// biome-ignore lint/correctness/useHookAtTopLevel: Flue resource hooks explicitly support deterministic loops.
		useTool(tool);
	}

	return bookkeeperInstructions;
}

Bookkeeper.agentName = 'bookkeeper';
