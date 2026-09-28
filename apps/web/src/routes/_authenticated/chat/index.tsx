import { Button } from '@bookeeping-agent/ui/components/button';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { MessagesSquareIcon, PlusIcon } from 'lucide-react';

import { useCreateConversation } from '../../../components/chat/use-create-conversation';
import { conversationsQueryOptions } from '../../../lib/queries';

export const Route = createFileRoute('/_authenticated/chat/')({
	beforeLoad: async ({ context }) => {
		const conversations = await context.queryClient.ensureQueryData(
			conversationsQueryOptions
		);
		const [latest] = conversations;

		if (latest) {
			throw redirect({
				params: { conversationId: latest.id },
				to: '/chat/$conversationId',
			});
		}
	},
	component: ChatIndex,
});

function ChatIndex() {
	const createMutation = useCreateConversation();

	return (
		<main className="grid min-h-0 place-items-center px-4 py-6 md:px-8">
			<div className="flex max-w-sm flex-col items-center gap-4 text-center">
				<div className="flex size-12 items-center justify-center border bg-muted text-muted-foreground">
					<MessagesSquareIcon className="size-6" />
				</div>
				<div>
					<h1 className="font-semibold text-lg tracking-tight">No chats yet</h1>
					<p className="mt-1 text-muted-foreground text-sm leading-relaxed">
						Start a conversation to ask about spending or log expenses from
						receipts.
					</p>
				</div>
				<Button
					disabled={createMutation.isPending}
					onClick={() => createMutation.mutate()}
					type="button"
				>
					<PlusIcon data-icon="inline-start" />
					{createMutation.isPending ? 'Starting…' : 'New chat'}
				</Button>
			</div>
		</main>
	);
}
