import { env } from '@bookeeping-agent/env/server';
import { type AgentRouteHandler, createAgent } from '@flue/runtime';
import { bookkeeperInstructions } from '../instructions/bookkeeper.ts';
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

export default createAgent(() => ({
	model: env.AGENT_MODEL,
	instructions: bookkeeperInstructions,
	skills: [spendAnalysis, receiptEntry],
	tools: bookkeeperTools,
}));
