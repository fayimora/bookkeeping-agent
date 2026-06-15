import { Button } from '@bookeeping-agent/ui/components/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@bookeeping-agent/ui/components/card';
import { Textarea } from '@bookeeping-agent/ui/components/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
	BotIcon,
	PaperclipIcon,
	SendIcon,
	UserIcon,
	XIcon,
} from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';

import { sendChatMessage } from '../../server/chat';

interface ChatMessage {
	content: string;
	id: string;
	role: 'assistant' | 'user';
}

function createMessage(
	role: ChatMessage['role'],
	content: string
): ChatMessage {
	return {
		id: crypto.randomUUID(),
		role,
		content,
	};
}

export function ChatShell() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const queryClient = useQueryClient();
	const [files, setFiles] = useState<File[]>([]);
	const [message, setMessage] = useState('');
	const [messages, setMessages] = useState<ChatMessage[]>([]);

	const chatMutation = useMutation({
		mutationFn: async (content: string) =>
			await sendChatMessage({ data: { message: content } }),
		onError: () => {
			toast.error('Could not reach the bookkeeper agent');
		},
		onSuccess: async (response) => {
			setMessages((currentMessages) => [
				...currentMessages,
				createMessage('assistant', response.message),
			]);
			await queryClient.invalidateQueries({ queryKey: ['expenses'] });
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedMessage = message.trim();

		if (!trimmedMessage) {
			return;
		}

		if (files.length > 0) {
			toast.info(
				'Receipt attachments are selected, but receipt processing is next. Sending text only.'
			);
		}

		setMessages((currentMessages) => [
			...currentMessages,
			createMessage('user', trimmedMessage),
		]);
		setMessage('');
		setFiles([]);
		chatMutation.mutate(trimmedMessage);
	};

	const canSend = message.trim().length > 0 && !chatMutation.isPending;

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
												<p className="whitespace-pre-wrap text-sm leading-relaxed">
													{chatMessage.content}
												</p>
											</div>
										</div>
									))}
									{chatMutation.isPending ? (
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
							{files.length > 0 ? (
								<ul className="flex flex-wrap gap-2">
									{files.map((file) => (
										<li
											className="flex items-center gap-2 border bg-muted px-3 py-2 text-muted-foreground text-xs"
											key={`${file.name}-${file.lastModified}`}
										>
											<PaperclipIcon className="size-3.5" />
											<span className="max-w-52 truncate">{file.name}</span>
											<button
												aria-label={`Remove ${file.name}`}
												className="text-muted-foreground transition-colors hover:text-foreground"
												onClick={() =>
													setFiles((currentFiles) =>
														currentFiles.filter(
															(currentFile) => currentFile !== file
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
								accept="image/*,.pdf"
								className="sr-only"
								multiple
								onChange={(event) =>
									setFiles(Array.from(event.target.files ?? []))
								}
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
