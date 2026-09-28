import { ConversationsRepo } from '@bookeeping-agent/db';
import {
	ConversationNotOwned,
	type Message,
	SendChatMessageInput,
	UserId,
} from '@bookeeping-agent/domain';
import { Effect, Layer, Schema } from 'effect';
import { describe, expect, it } from 'vitest';

import { CurrentUser } from '../src/server/auth';
import { BookkeeperClient } from '../src/server/bookkeeper-client';
import { sendChatMessageWorkflow } from '../src/server/chat-workflow';

const conversationId = '33333333-3333-4333-8333-333333333333';

const makeHarness = (options: { readonly owned: boolean }) => {
	const addMessageCalls: unknown[][] = [];
	const prompts: string[] = [];
	const unexpected = (name: string) => () =>
		Effect.die(`Unexpected ConversationsRepo.${name}`);

	const layer = Layer.mergeAll(
		Layer.succeed(CurrentUser, {
			id: Schema.decodeUnknownSync(UserId)('workflow-user'),
		}),
		Layer.succeed(
			ConversationsRepo,
			ConversationsRepo.of({
				addMessage: (...args) => {
					addMessageCalls.push(args);
					const [userId, id] = args;
					return options.owned
						? Effect.succeed({} as Message)
						: Effect.fail(
								ConversationNotOwned.make({ conversationId: id, userId })
							);
				},
				create: unexpected('create'),
				delete: unexpected('delete'),
				getById: unexpected('getById'),
				list: unexpected('list'),
				listMessages: unexpected('listMessages'),
				rename: unexpected('rename'),
			})
		),
		Layer.succeed(
			BookkeeperClient,
			BookkeeperClient.of({
				prompt: (instanceId) => {
					prompts.push(instanceId);
					return Effect.succeed({ text: 'Logged it.' });
				},
			})
		)
	);

	return { addMessageCalls, layer, prompts };
};

const input = Schema.decodeUnknownSync(SendChatMessageInput)({
	conversationId,
	message: '  Lunch   at Pret  ',
});

describe('sendChatMessageWorkflow', () => {
	it('persists both turns with the title folded into the user message write', async () => {
		const harness = makeHarness({ owned: true });
		const result = await Effect.runPromise(
			sendChatMessageWorkflow(input).pipe(Effect.provide(harness.layer))
		);

		expect(result.message).toBe('Logged it.');
		expect(harness.prompts).toEqual([`workflow-user::${conversationId}`]);
		expect(harness.addMessageCalls).toHaveLength(2);
		expect(harness.addMessageCalls[0]?.[3]).toEqual({
			titleIfDefault: 'Lunch at Pret',
		});
		expect(harness.addMessageCalls[1]?.[3]).toBeUndefined();
	});

	it('never prompts the agent for a conversation the user does not own', async () => {
		const harness = makeHarness({ owned: false });
		const exit = await Effect.runPromiseExit(
			sendChatMessageWorkflow(input).pipe(Effect.provide(harness.layer))
		);

		expect(exit._tag).toBe('Failure');
		expect(harness.prompts).toEqual([]);
		expect(harness.addMessageCalls).toHaveLength(1);
	});
});
