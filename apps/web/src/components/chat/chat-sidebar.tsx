import {
	AlertDialog,
	AlertDialogActionButton,
	AlertDialogCancelButton,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@bookeeping-agent/ui/components/alert-dialog';
import { Button } from '@bookeeping-agent/ui/components/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@bookeeping-agent/ui/components/dropdown-menu';
import { Input } from '@bookeeping-agent/ui/components/input';
import { Skeleton } from '@bookeeping-agent/ui/components/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
	MoreHorizontalIcon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
} from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useState } from 'react';
import { toast } from 'sonner';

import {
	createConversation,
	deleteConversation,
	listConversations,
	renameConversation,
} from '../../server/conversations';

type Conversation = Awaited<ReturnType<typeof listConversations>>[number];

const maxTitleLength = 200;

export function ChatSidebar() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const params = useParams({ strict: false });
	const activeConversationId = params.conversationId;

	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState('');
	const [conversationToDelete, setConversationToDelete] =
		useState<Conversation | null>(null);

	const conversationsQuery = useQuery({
		queryKey: ['conversations'],
		queryFn: async () => await listConversations(),
	});

	const invalidateConversations = async () => {
		await queryClient.invalidateQueries({ queryKey: ['conversations'] });
	};

	const createMutation = useMutation({
		mutationFn: async () => await createConversation({ data: {} }),
		onError: () => toast.error('Could not start a new chat'),
		onSuccess: async (conversation) => {
			if (!conversation) {
				return;
			}

			await invalidateConversations();
			await navigate({
				to: '/chat/$conversationId',
				params: { conversationId: conversation.id },
			});
		},
	});

	const renameMutation = useMutation({
		mutationFn: async (variables: { id: string; title: string }) =>
			await renameConversation({
				data: { id: variables.id, input: { title: variables.title } },
			}),
		onError: () => toast.error('Could not rename chat'),
		onSuccess: async () => {
			await invalidateConversations();
			toast.success('Chat renamed');
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (conversation: Conversation) =>
			await deleteConversation({ data: { id: conversation.id } }),
		onError: () => toast.error('Could not delete chat'),
		onSuccess: async (_result, conversation) => {
			await invalidateConversations();
			setConversationToDelete(null);
			toast.success('Chat deleted');

			if (activeConversationId !== conversation.id) {
				return;
			}

			const remaining = (conversationsQuery.data ?? []).filter(
				(item) => item.id !== conversation.id
			);
			const [next] = remaining;

			await (next
				? navigate({
						to: '/chat/$conversationId',
						params: { conversationId: next.id },
					})
				: navigate({ to: '/chat' }));
		},
	});

	const startRenaming = (conversation: Conversation) => {
		setRenamingId(conversation.id);
		setRenameValue(conversation.title);
	};

	const cancelRenaming = () => {
		setRenamingId(null);
		setRenameValue('');
	};

	const commitRename = (conversation: Conversation) => {
		const trimmed = renameValue.trim();

		if (!trimmed) {
			toast.error('Chat name cannot be empty');
			return;
		}

		if (trimmed.length > maxTitleLength) {
			toast.error(`Chat name must be ${maxTitleLength} characters or fewer`);
			return;
		}

		if (trimmed !== conversation.title) {
			renameMutation.mutate({ id: conversation.id, title: trimmed });
		}

		cancelRenaming();
	};

	const handleRenameKeyDown = (
		event: KeyboardEvent<HTMLInputElement>,
		conversation: Conversation
	) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitRename(conversation);
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			cancelRenaming();
		}
	};

	const conversations = conversationsQuery.data ?? [];

	let listContent: ReactNode;

	if (conversationsQuery.isPending) {
		listContent = (
			<div className="flex flex-col gap-2">
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-9 w-full" />
			</div>
		);
	} else if (conversations.length === 0) {
		listContent = (
			<p className="px-2 py-6 text-center text-muted-foreground text-sm leading-relaxed">
				No chats yet. Start a new one to begin.
			</p>
		);
	} else {
		listContent = (
			<ul className="flex flex-col gap-1">
				{conversations.map((conversation) => (
					<li key={conversation.id}>
						{renamingId === conversation.id ? (
							<Input
								aria-label="Rename chat"
								autoFocus
								className="h-9 px-2"
								onBlur={() => commitRename(conversation)}
								onChange={(event) => setRenameValue(event.target.value)}
								onKeyDown={(event) => handleRenameKeyDown(event, conversation)}
								value={renameValue}
							/>
						) : (
							<div className="group flex items-center gap-1">
								<Link
									activeProps={{
										className: 'bg-muted text-foreground',
									}}
									className="min-w-0 flex-1 truncate border border-transparent px-2 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
									params={{ conversationId: conversation.id }}
									to="/chat/$conversationId"
								>
									{conversation.title}
								</Link>
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button
												aria-label={`Actions for ${conversation.title}`}
												size="icon-xs"
												type="button"
												variant="ghost"
											/>
										}
									>
										<MoreHorizontalIcon />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() => startRenaming(conversation)}
										>
											<PencilIcon />
											Rename
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setConversationToDelete(conversation)}
											variant="destructive"
										>
											<Trash2Icon />
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						)}
					</li>
				))}
			</ul>
		);
	}

	return (
		<aside className="flex min-h-0 flex-col border-r bg-background/40">
			<div className="flex items-center justify-between gap-2 border-b px-3 py-3">
				<h2 className="font-semibold text-sm tracking-tight">Chats</h2>
				<Button
					disabled={createMutation.isPending}
					onClick={() => createMutation.mutate()}
					size="xs"
					type="button"
					variant="outline"
				>
					<PlusIcon data-icon="inline-start" />
					New chat
				</Button>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto p-2">{listContent}</div>

			<AlertDialog
				onOpenChange={(open) => {
					if (!open) {
						setConversationToDelete(null);
					}
				}}
				open={Boolean(conversationToDelete)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete chat?</AlertDialogTitle>
						<AlertDialogDescription>
							{conversationToDelete
								? `“${conversationToDelete.title}” and its messages will be permanently removed.`
								: 'This chat and its messages will be permanently removed.'}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
						<AlertDialogActionButton
							onClick={() => {
								if (conversationToDelete) {
									deleteMutation.mutate(conversationToDelete);
								}
							}}
						>
							Delete chat
						</AlertDialogActionButton>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</aside>
	);
}
