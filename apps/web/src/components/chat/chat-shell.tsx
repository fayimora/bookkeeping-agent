import { Button } from '@bookeeping-agent/ui/components/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@bookeeping-agent/ui/components/card';
import { Textarea } from '@bookeeping-agent/ui/components/textarea';
import { type UIMessage, useFlueAgent } from '@flue/react';
import { useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import {
	BotIcon,
	PaperclipIcon,
	SendIcon,
	UserIcon,
	XIcon,
} from 'lucide-react';
import { marked } from 'marked';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { authClient } from '../../lib/auth-client';
import {
	isSupportedImageType,
	maxAttachments,
	maxImageBytes,
	supportedImageTypes,
} from '../../lib/chat-attachments';

const AGENT_NAME = 'bookkeeper';
const receiptOnlyMessage = 'Please log the expense from the attached receipt.';

interface SelectedReceiptAttachment {
	data: string;
	id: string;
	mimeType: string;
	name: string;
}

function renderMarkdownToSafeHtml(markdown: string) {
	const html = marked.parse(markdown, { async: false }) as string;
	return DOMPurify.sanitize(html);
}

function AssistantMarkdown({ markdown }: { markdown: string }) {
	return (
		<div
			className="assistant-markdown"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: markdown is rendered then sanitized with DOMPurify at this sink.
			dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(markdown) }}
		/>
	);
}

function MessageText({
	isAssistant,
	state,
	text,
}: {
	isAssistant: boolean;
	state?: 'done' | 'streaming';
	text: string;
}) {
	if (!text) {
		return null;
	}

	// Render rich markdown for completed assistant turns; show plain text while
	// streaming (and always for the user's own messages).
	if (isAssistant && state !== 'streaming') {
		return <AssistantMarkdown markdown={text} />;
	}

	return <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>;
}

function MessageBubble({ message }: { message: UIMessage }) {
	const isUser = message.role === 'user';
	const textParts = message.parts.filter((part) => part.type === 'text');
	const fileParts = message.parts.filter((part) => part.type === 'file');

	return (
		<div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
			<div
				className={
					isUser
						? 'flex max-w-[80%] gap-3 border bg-primary px-4 py-3 text-primary-foreground'
						: 'flex max-w-[80%] gap-3 border bg-muted px-4 py-3 text-foreground'
				}
			>
				{isUser ? (
					<UserIcon className="mt-0.5 size-4 shrink-0" />
				) : (
					<BotIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
				)}
				<div className="flex flex-col gap-2">
					{textParts.map((part, index) => (
						<MessageText
							isAssistant={!isUser}
							// biome-ignore lint/suspicious/noArrayIndexKey: parts are positionally stable within a message.
							key={index}
							state={part.state}
							text={part.text}
						/>
					))}
					{fileParts.length > 0 ? (
						<ul className="flex flex-wrap gap-1.5">
							{fileParts.map((part, index) => (
								<li
									className="flex items-center gap-1 border border-primary-foreground/20 px-2 py-1 text-primary-foreground/80 text-xs"
									// biome-ignore lint/suspicious/noArrayIndexKey: parts are positionally stable within a message.
									key={index}
								>
									<PaperclipIcon className="size-3" />
									<span>{part.mediaType}</span>
								</li>
							))}
						</ul>
					) : null}
				</div>
			</div>
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
	const base64Data = dataUrl.split(',')[1];

	if (!base64Data) {
		throw new Error('Could not encode receipt image.');
	}

	return {
		id: crypto.randomUUID(),
		name: file.name,
		data: base64Data,
		mimeType: file.type,
	};
}

export function ChatShell() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const userId = session?.user.id;

	const agent = useFlueAgent({ name: AGENT_NAME, id: userId });
	const { messages, status, sendMessage } = agent;

	const [attachments, setAttachments] = useState<SelectedReceiptAttachment[]>(
		[]
	);
	const [message, setMessage] = useState('');

	const isBusy = status === 'submitted' || status === 'streaming';

	// Refresh the expenses table whenever a turn finishes (the agent may have
	// created, updated, or deleted expenses while replying).
	const previousStatus = useRef(status);
	useEffect(() => {
		if (
			(previousStatus.current === 'submitted' ||
				previousStatus.current === 'streaming') &&
			status === 'idle'
		) {
			queryClient.invalidateQueries({ queryKey: ['expenses'] });
		}

		previousStatus.current = status;
	}, [status, queryClient]);

	useEffect(() => {
		if (status === 'error') {
			toast.error('Could not reach the bookkeeper agent');
		}
	}, [status]);

	const lastMessage = messages.at(-1);
	const assistantIsStreaming =
		lastMessage?.role === 'assistant' &&
		lastMessage.parts.some(
			(part) => part.type === 'text' && part.text.length > 0
		);
	const showThinking = isBusy && !assistantIsStreaming;

	const canSend =
		(message.trim().length > 0 || attachments.length > 0) &&
		!isBusy &&
		Boolean(userId);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedMessage = message.trim();
		const selectedAttachments = attachments;

		if ((!trimmedMessage && selectedAttachments.length === 0) || isBusy) {
			return;
		}

		setMessage('');
		setAttachments([]);

		try {
			await sendMessage(trimmedMessage || receiptOnlyMessage, {
				images: selectedAttachments.length
					? selectedAttachments.map(({ data, mimeType }) => ({
							type: 'image' as const,
							data,
							mimeType,
						}))
					: undefined,
			});
		} catch {
			toast.error('Could not reach the bookkeeper agent');
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
			toast.error('Receipt images must be 5MB or smaller.');
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
						<CardTitle>Bookkeeper assistant</CardTitle>
						<CardDescription>
							Ask questions or add a text expense.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex min-h-0 flex-1 flex-col gap-5">
						<div
							aria-live="polite"
							className="min-h-72 flex-1 space-y-4 overflow-auto border bg-background/40 p-4"
						>
							{messages.length === 0 ? (
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
							) : (
								<div className="flex flex-col gap-4">
									{messages.map((chatMessage) => (
										<MessageBubble key={chatMessage.id} message={chatMessage} />
									))}
									{showThinking ? (
										<div className="flex justify-start">
											<div className="flex max-w-[80%] items-center gap-3 border bg-muted px-4 py-3 text-muted-foreground text-sm">
												<BotIcon className="size-4" />
												Thinking…
											</div>
										</div>
									) : null}
								</div>
							)}
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
								disabled={isBusy}
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
									disabled={isBusy}
									onClick={() => fileInputRef.current?.click()}
									type="button"
									variant="outline"
								>
									<PaperclipIcon data-icon="inline-start" />
									Attach receipt
								</Button>
								<Button disabled={!canSend} type="submit">
									{isBusy ? 'Sending…' : 'Send message'}
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
