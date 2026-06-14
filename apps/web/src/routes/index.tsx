import { buttonVariants } from '@bookeeping-agent/ui/components/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@bookeeping-agent/ui/components/card';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRightIcon, ReceiptTextIcon } from 'lucide-react';

export const Route = createFileRoute('/')({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<main className="grid min-h-0 place-items-center overflow-auto px-4 py-10 md:px-8">
			<Card className="w-full max-w-2xl">
				<CardHeader className="gap-4">
					<div className="flex size-11 items-center justify-center border bg-primary/10 text-primary">
						<ReceiptTextIcon className="size-5" />
					</div>
					<div>
						<CardTitle className="text-xl normal-case tracking-tight">
							Bookkeeping Agent
						</CardTitle>
						<CardDescription className="mt-3 max-w-xl">
							A simple bookkeeping agent/app. Just an excuse to build an agent
							and play with{' '}
							<a href="https://flueframework.com/">Flue Framework</a>
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					<Link className={buttonVariants()} to="/expenses">
						Go to expenses
						<ArrowRightIcon data-icon="inline-end" />
					</Link>
				</CardContent>
			</Card>
		</main>
	);
}
