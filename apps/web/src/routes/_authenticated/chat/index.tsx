import { Button } from '@bookeeping-agent/ui/components/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { MessagesSquareIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
	createConversation,
	listConversations,
} from '../../../server/conversations';

export const Route = createFileRoute('/_authenticated/chat/')({
	beforeLoad: async () => {
		const conversations = await listConversations();
		const [latest] = conversations;

		if (latest) {
			throw redirect({
				to: '/chat/$conversationId',
				params: { conversationId: latest.id },
			});
		}
	},
	component: ChatIndex,
});

function ChatIndex() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const createMutation = useMutation({
		mutationFn: async () => await createConversation({ data: {} }),
		onError: () => toast.error('Could not start a new chat'),
		onSuccess: async (conversation) => {
			if (!conversation) {
				return;
			}

			await queryClient.invalidateQueries({ queryKey: ['conversations'] });
			await navigate({
				to: '/chat/$conversationId',
				params: { conversationId: conversation.id },
			});
		},
	});

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
