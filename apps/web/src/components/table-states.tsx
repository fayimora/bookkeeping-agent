import { Button } from '@bookeeping-agent/ui/components/button';
import { Skeleton } from '@bookeeping-agent/ui/components/skeleton';
import { TableCell } from '@bookeeping-agent/ui/components/table';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
	action,
	description,
	title,
}: {
	action?: ReactNode;
	description: string;
	title: string;
}) {
	return (
		<div className="flex min-h-64 flex-col items-center justify-center border border-dashed p-8 text-center">
			<h2 className="font-medium text-base">{title}</h2>
			<p className="mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
				{description}
			</p>
			{action ? <div className="mt-5">{action}</div> : null}
		</div>
	);
}

export function TableSkeleton() {
	return (
		<div className="grid gap-3">
			{Array.from({ length: 5 }).map((_, index) => (
				<Skeleton className="h-11 w-full" key={index.toString()} />
			))}
		</div>
	);
}

export function RowActionsCell({
	onDelete,
	onEdit,
}: {
	onDelete: () => void;
	onEdit: () => void;
}) {
	return (
		<TableCell>
			<div className="flex justify-end gap-2">
				<Button onClick={onEdit} size="xs" type="button" variant="outline">
					<PencilIcon data-icon="inline-start" />
					Edit
				</Button>
				<Button
					onClick={onDelete}
					size="xs"
					type="button"
					variant="destructive"
				>
					<Trash2Icon data-icon="inline-start" />
					Delete
				</Button>
			</div>
		</TableCell>
	);
}
