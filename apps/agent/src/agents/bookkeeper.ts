'use agent';

import { parseAgentInstanceUserId, UserId } from '@bookeeping-agent/domain';
import { AgentConfig } from '@bookeeping-agent/env/agent';
import { type AgentProps, useModel, useTool } from '@flue/runtime';
import { Effect, Schema } from 'effect';

import { bookkeeperInstructions } from '../instructions/bookkeeper';
import { registerAgentObservability } from '../observability';
import { categoryTools } from '../tools/categories/tools';
import { expenseTools } from '../tools/expenses/tools';

const agentConfig = Effect.runSync(
	Effect.all({
		model: AgentConfig.model,
		observability: AgentConfig.observability,
	})
);

registerAgentObservability(agentConfig.observability);

const decodeUserId = Schema.decodeUnknownSync(UserId);

export function Bookkeeper({ id: instanceId }: AgentProps) {
	const userId = decodeUserId(parseAgentInstanceUserId(instanceId));

	useModel(agentConfig.model);
	for (const tool of [...categoryTools(userId), ...expenseTools(userId)]) {
		// biome-ignore lint/correctness/useHookAtTopLevel: Flue resource hooks explicitly support deterministic loops.
		useTool(tool);
	}

	return bookkeeperInstructions;
}

Bookkeeper.agentName = 'bookkeeper';
