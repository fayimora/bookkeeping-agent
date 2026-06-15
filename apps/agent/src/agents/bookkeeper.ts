import { createAgent } from '@flue/runtime';

import { bookkeeperInstructions } from '../instructions/bookkeeper.ts';

export default createAgent(() => ({
	name: 'bookkeeper',
	description: 'Personal bookkeeping assistant for expenses and receipts.',
	model: false,
	instructions: bookkeeperInstructions,
}));
