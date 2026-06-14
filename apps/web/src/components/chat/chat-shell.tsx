import { Button } from '@bookeeping-agent/ui/components/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@bookeeping-agent/ui/components/card';
import { Textarea } from '@bookeeping-agent/ui/components/textarea';
import { BotIcon, PaperclipIcon, SendIcon, XIcon } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';

export function ChatShell() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [files, setFiles] = useState<File[]>([]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
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
							Ask questions or attach a receipt.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex min-h-0 flex-1 flex-col gap-5">
						<div className="grid min-h-72 flex-1 place-items-center border bg-background/40 p-6 text-center">
							<div className="flex max-w-sm flex-col items-center gap-3">
								<div className="flex size-10 items-center justify-center border bg-muted text-muted-foreground">
									<BotIcon className="size-5" />
								</div>
								<div>
									<p className="font-medium text-sm">No messages yet</p>
									<p className="mt-1 text-muted-foreground text-sm leading-relaxed">
										Send a message or attach a receipt.
									</p>
								</div>
							</div>
						</div>

						<form className="flex flex-col gap-3" onSubmit={handleSubmit}>
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
								id="chat-message"
								placeholder="Ask about expenses or attach a receipt"
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
									onClick={() => fileInputRef.current?.click()}
									type="button"
									variant="outline"
								>
									<PaperclipIcon data-icon="inline-start" />
									Attach receipt
								</Button>
								<Button type="submit">
									Send message
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
