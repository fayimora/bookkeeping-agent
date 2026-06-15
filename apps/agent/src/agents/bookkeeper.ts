import { env } from '@bookeeping-agent/env/server';
import { createAgent } from '@flue/runtime';
import { bookkeeperInstructions } from '../instructions/bookkeeper.ts';
import receiptEntry from '../skills/receipt-entry/SKILL.md' with {
	type: 'skill',
};
import spendAnalysis from '../skills/spend-analysis/SKILL.md' with {
	type: 'skill',
};
import { expenseTools } from '../tools/expenses.ts';

export default createAgent(() => ({
	name: 'bookkeeper',
	description: 'Personal bookkeeping assistant for expenses and receipts.',
	model: env.AGENT_MODEL,
	instructions: bookkeeperInstructions,
	skills: [spendAnalysis, receiptEntry],
	tools: expenseTools,
}));
