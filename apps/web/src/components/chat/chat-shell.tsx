import {
	isSupportedImageType,
	maxAttachments,
	maxImageBytes,
	supportedImageTypes,
} from '@bookeeping-agent/domain/chat-attachments';
import { Button } from '@bookeeping-agent/ui/components/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@bookeeping-agent/ui/components/card';
import { Textarea } from '@bookeeping-agent/ui/components/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import {
	BotIcon,
	CopyIcon,
	PaperclipIcon,
	SendIcon,
	UserIcon,
	XIcon,
} from 'lucide-react';
import { type FormEvent, memo, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
	categoriesQueryOptions,
	conversationsQueryOptions,
	expensesQueryOptions,
} from '../../lib/queries';
import { sendChatMessage } from '../../server/chat';
import { listMessages } from '../../server/conversations';

type ServerMessage = Awaited<ReturnType<typeof listMessages>>[number];

const receiptOnlyMessage = 'Please log the expense from the attached receipt.';

const pendingMessageId = 'pending-user-message';

interface ChatImageInput {
	data: string;
	mimeType: string;
	name?: string;
	type: 'image';
}

interface SelectedReceiptAttachment extends ChatImageInput {
	id: string;
	name: string;
}

interface ChatMessage {
	attachmentNames?: string[];
	content: string;
	html?: string;
	id: string;
	role: 'assistant' | 'user';
}

// Memoized so composer keystrokes don't re-sanitize the whole transcript.
const AssistantMarkdown = memo(function AssistantMarkdownHtml({
	html,
}: {
	html: string;
}) {
	return (
		<div
			className="assistant-markdown"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: html is sanitized with DOMPurify at this sink (defense-in-depth; the server also sanitizes with sanitize-html).
			dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
		/>
	);
});

function ChatMessageContent({ chatMessage }: { chatMessage: ChatMessage }) {
	if (chatMessage.html) {
		return <AssistantMarkdown html={chatMessage.html} />;
	}

	if (!chatMessage.content) {
		return null;
	}

	return (
		<p className="whitespace-pre-wrap text-sm leading-relaxed">
			{chatMessage.content}
		</p>
	);
}

function mapServerMessage(row: ServerMessage): ChatMessage {
	return {
		attachmentNames: row.attachmentNames ?? undefined,
		content: row.content,
		html: row.role === 'assistant' ? (row.contentHtml ?? undefined) : undefined,
		id: row.id,
		role: row.role === 'assistant' ? 'assistant' : 'user',
	};
}

function ChatTranscript({
	isLoading,
	isThinking,
	messages,
}: {
	isLoading: boolean;
	isThinking: boolean;
	messages: ChatMessage[];
}) {
	if (isLoading) {
		return (
			<div className="grid min-h-60 place-items-center text-center text-muted-foreground text-sm">
				Loading messages…
			</div>
		);
	}

	if (messages.length === 0) {
		return (
			<div className="grid min-h-60 place-items-center text-center">
				<div className="flex max-w-sm flex-col items-center gap-3">
					<div className="flex size-10 items-center justify-center border bg-muted text-muted-foreground">
						<BotIcon className="size-5" />
					</div>
					<div>
						<p className="font-medium text-sm">No messages yet</p>
						<p className="mt-1 text-muted-foreground text-sm leading-relaxed">
							Ask about expenses or add one in plain English.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{messages.map((chatMessage) => (
				<div
					className={
						chatMessage.role === 'user'
							? 'flex justify-end'
							: 'flex justify-start'
					}
					key={chatMessage.id}
				>
					<div
						className={
							chatMessage.role === 'user'
								? 'flex max-w-[80%] gap-3 border bg-primary px-4 py-3 text-primary-foreground'
								: 'flex max-w-[80%] gap-3 border bg-muted px-4 py-3 text-foreground'
						}
					>
						{chatMessage.role === 'user' ? (
							<UserIcon className="mt-0.5 size-4 shrink-0" />
						) : (
							<BotIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
						)}
						<div className="flex flex-col gap-2">
							<ChatMessageContent chatMessage={chatMessage} />
							{chatMessage.attachmentNames?.length ? (
								<ul className="flex flex-wrap gap-1.5">
									{chatMessage.attachmentNames.map((attachmentName) => (
										<li
											className="flex items-center gap-1 border border-primary-foreground/20 px-2 py-1 text-primary-foreground/80 text-xs"
											key={attachmentName}
										>
											<PaperclipIcon className="size-3" />
											<span className="max-w-40 truncate">
												{attachmentName}
											</span>
										</li>
									))}
								</ul>
							) : null}
						</div>
					</div>
				</div>
			))}
			{isThinking ? (
				<div className="flex justify-start">
					<div className="flex max-w-[80%] items-center gap-3 border bg-muted px-4 py-3 text-muted-foreground text-sm">
						<BotIcon className="size-4" />
						Thinking…
					</div>
				</div>
			) : null}
		</div>
	);
}

function readFileAsDataUrl(file: File) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener('load', () => {
			if (typeof reader.result === 'string') {
				resolve(reader.result);
				return;
			}

			reject(new Error('Could not read receipt image.'));
		});
		reader.addEventListener('error', () => {
			reject(reader.error ?? new Error('Could not read receipt image.'));
		});
		reader.readAsDataURL(file);
	});
}

async function fileToReceiptAttachment(
	file: File
): Promise<SelectedReceiptAttachment> {
	const dataUrl = await readFileAsDataUrl(file);
	const [, base64Data] = dataUrl.split(',');

	if (!base64Data) {
		throw new Error('Could not encode receipt image.');
	}

	return {
		data: base64Data,
		id: crypto.randomUUID(),
		mimeType: file.type,
		name: file.name,
		type: 'image',
	};
}

export function ChatShell({ conversationId }: { conversationId: string }) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const queryClient = useQueryClient();
	const [attachments, setAttachments] = useState<SelectedReceiptAttachment[]>(
		[]
	);
	const [message, setMessage] = useState('');
	const messagesQueryKey = ['messages', conversationId];

	const messagesQuery = useQuery({
		queryFn: async () => await listMessages({ data: { conversationId } }),
		queryKey: messagesQueryKey,
	});

	const chatMutation = useMutation({
		mutationFn: async (input: { content: string; images: ChatImageInput[] }) =>
			await sendChatMessage({
				data: { conversationId, images: input.images, message: input.content },
			}),
		onError: async () => {
			toast.error('Could not reach the bookkeeper agent');
			// The user turn may already be persisted; resync to what was saved.
			await queryClient.invalidateQueries({ queryKey: messagesQueryKey });
		},
		// A background refetch landing mid-send would clobber the appended rows.
		onMutate: () => queryClient.cancelQueries({ queryKey: messagesQueryKey }),
		onSuccess: async ({ assistantMessage, userMessage }) => {
			if (queryClient.getQueryData(messagesQueryKey) === undefined) {
				await queryClient.invalidateQueries({ queryKey: messagesQueryKey });
			} else {
				queryClient.setQueryData<ServerMessage[]>(
					messagesQueryKey,
					(current) => [...(current ?? []), userMessage, assistantMessage]
				);
			}
			// Not awaited: the mutation stays pending until onSuccess settles, which
			// would show the optimistic bubble next to the persisted row. The prompt
			// result doesn't say which tools ran, so ledger data is just marked
			// stale; inactive queries refetch when their page is next opened.
			for (const { queryKey } of [
				conversationsQueryOptions,
				expensesQueryOptions,
				categoriesQueryOptions,
			]) {
				queryClient.invalidateQueries({ queryKey });
			}
		},
	});

	const serverMessages = messagesQuery.data;
	const pendingInput = chatMutation.isPending
		? chatMutation.variables
		: undefined;
	const messages = useMemo(() => {
		const persisted = serverMessages?.map(mapServerMessage) ?? [];
		if (pendingInput === undefined) {
			return persisted;
		}
		const pending: ChatMessage = {
			attachmentNames: pendingInput.images.flatMap((image) =>
				image.name === undefined ? [] : [image.name]
			),
			content: pendingInput.content,
			id: pendingMessageId,
			role: 'user',
		};
		return [...persisted, pending];
	}, [serverMessages, pendingInput]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedMessage = message.trim();
		const selectedAttachments = attachments;

		if (!trimmedMessage && selectedAttachments.length === 0) {
			return;
		}

		setMessage('');
		setAttachments([]);
		chatMutation.mutate({
			content: trimmedMessage || receiptOnlyMessage,
			images: selectedAttachments.map(({ data, mimeType, name, type }) => ({
				data,
				mimeType,
				name,
				type,
			})),
		});
	};

	const canSend =
		(message.trim().length > 0 || attachments.length > 0) &&
		!chatMutation.isPending;

	const handleCopyDebugId = async () => {
		try {
			await navigator.clipboard.writeText(conversationId);
			toast.success('Debug ID copied');
		} catch {
			toast.error('Could not copy the Debug ID');
		}
	};

	const handleFileChange = async (filesToAttach: FileList | null) => {
		const selectedFiles = Array.from(filesToAttach ?? []);

		if (selectedFiles.length === 0) {
			return;
		}

		const imageFiles = selectedFiles.filter((file) =>
			isSupportedImageType(file.type)
		);

		if (imageFiles.length < selectedFiles.length) {
			toast.info('Only JPEG, PNG, GIF, or WebP receipt images are supported.');
		}

		const sizedFiles = imageFiles.filter((file) => file.size <= maxImageBytes);

		if (sizedFiles.length < imageFiles.length) {
			toast.error(
				`Receipt images must be ${maxImageBytes / 1024 / 1024}MB or smaller.`
			);
		}

		if (sizedFiles.length === 0) {
			return;
		}

		try {
			const encodedAttachments = await Promise.all(
				sizedFiles.slice(0, maxAttachments).map(fileToReceiptAttachment)
			);
			setAttachments(encodedAttachments);

			if (sizedFiles.length > maxAttachments) {
				toast.info(`Attached the first ${maxAttachments} receipt images.`);
			}
		} catch {
			toast.error('Could not read one of the receipt images.');
		}
	};

	return (
		<main className="min-h-0 overflow-auto px-4 py-6 md:px-8">
			<div className="mx-auto flex h-full max-w-4xl flex-col gap-6">
				<section className="max-w-2xl">
					<h1 className="font-semibold text-2xl tracking-tight">Chat</h1>
					<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
						Ask about spending or add expenses from receipts.
					</p>
				</section>

				<Card className="min-h-0 flex-1">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardTitle>Bookkeeper assistant</CardTitle>
								<CardDescription>
									Ask questions or add a text expense.
								</CardDescription>
							</div>
							<Button
								onClick={handleCopyDebugId}
								size="xs"
								type="button"
								variant="outline"
							>
								<CopyIcon />
								Copy Debug ID
							</Button>
						</div>
						<p className="break-all font-mono text-muted-foreground text-xs">
							Debug ID: {conversationId}
						</p>
					</CardHeader>
					<CardContent className="flex min-h-0 flex-1 flex-col gap-5">
						<div
							aria-live="polite"
							className="min-h-72 flex-1 space-y-4 overflow-auto border bg-background/40 p-4"
						>
							<ChatTranscript
								isLoading={messagesQuery.isPending}
								isThinking={chatMutation.isPending}
								messages={messages}
							/>
						</div>

						<form
							className="flex flex-col gap-3"
							onSubmit={handleSubmit}
							ref={formRef}
						>
							{attachments.length > 0 ? (
								<ul className="flex flex-wrap gap-2">
									{attachments.map((attachment) => (
										<li
											className="flex items-center gap-2 border bg-muted px-3 py-2 text-muted-foreground text-xs"
											key={attachment.id}
										>
											<PaperclipIcon className="size-3.5" />
											<span className="max-w-52 truncate">
												{attachment.name}
											</span>
											<button
												aria-label={`Remove ${attachment.name}`}
												className="text-muted-foreground transition-colors hover:text-foreground"
												onClick={() =>
													setAttachments((currentAttachments) =>
														currentAttachments.filter(
															(currentAttachment) =>
																currentAttachment.id !== attachment.id
														)
													)
												}
												type="button"
											>
												<XIcon className="size-3.5" />
											</button>
										</li>
									))}
								</ul>
							) : null}
							<label className="sr-only" htmlFor="chat-message">
								Message
							</label>
							<Textarea
								disabled={chatMutation.isPending}
								id="chat-message"
								onChange={(event) => setMessage(event.target.value)}
								onKeyDown={(event) => {
									if (
										event.key !== 'Enter' ||
										event.shiftKey ||
										event.nativeEvent.isComposing
									) {
										return;
									}

									event.preventDefault();

									if (canSend) {
										formRef.current?.requestSubmit();
									}
								}}
								placeholder="Ask about expenses or add one, e.g. “Add £12.50 at Pret today for food”"
								value={message}
							/>
							<input
								accept={supportedImageTypes.join(',')}
								className="sr-only"
								multiple
								onChange={async (event) => {
									await handleFileChange(event.target.files);
									event.target.value = '';
								}}
								ref={fileInputRef}
								type="file"
							/>
							<div className="flex items-center justify-between gap-3">
								<Button
									disabled={chatMutation.isPending}
									onClick={() => fileInputRef.current?.click()}
									type="button"
									variant="outline"
								>
									<PaperclipIcon data-icon="inline-start" />
									Attach receipt
								</Button>
								<Button disabled={!canSend} type="submit">
									{chatMutation.isPending ? 'Sending…' : 'Send message'}
									<SendIcon data-icon="inline-end" />
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
