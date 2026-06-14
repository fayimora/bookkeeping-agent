import { Button } from '@bookeeping-agent/ui/components/button';
import { Skeleton } from '@bookeeping-agent/ui/components/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@bookeeping-agent/ui/components/table';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { Category } from './types';

export function CategoryTableState({
	categories,
	hasError,
	isLoading,
	onCreate,
	onDelete,
	onEdit,
}: {
	categories: Category[];
	hasError: boolean;
	isLoading: boolean;
	onCreate: () => void;
	onDelete: (category: Category) => void;
	onEdit: (category: Category) => void;
}) {
	if (isLoading) {
		return <CategoryTableSkeleton />;
	}

	if (hasError) {
		return (
			<CategoryEmptyState
				description="Check the database connection and try again."
				title="Could not load categories"
			/>
		);
	}

	if (categories.length === 0) {
		return (
			<CategoryEmptyState
				action={
					<Button onClick={onCreate} size="sm" type="button">
						Add first category
					</Button>
				}
				description="Create a few categories so expenses are easier to organize."
				title="No categories yet"
			/>
		);
	}

	return (
		<CategoryTable
			categories={categories}
			onDelete={onDelete}
			onEdit={onEdit}
		/>
	);
}

function CategoryTable({
	categories,
	onDelete,
	onEdit,
}: {
	categories: Category[];
	onDelete: (category: Category) => void;
	onEdit: (category: Category) => void;
}) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Slug</TableHead>
					<TableHead className="text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{categories.map((category) => (
					<TableRow key={category.id}>
						<TableCell className="font-medium">{category.name}</TableCell>
						<TableCell className="text-muted-foreground">
							{category.slug}
						</TableCell>
						<TableCell>
							<div className="flex justify-end gap-2">
								<Button
									onClick={() => onEdit(category)}
									size="xs"
									type="button"
									variant="outline"
								>
									<PencilIcon data-icon="inline-start" />
									Edit
								</Button>
								<Button
									onClick={() => onDelete(category)}
									size="xs"
									type="button"
									variant="destructive"
								>
									<Trash2Icon data-icon="inline-start" />
									Delete
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function CategoryEmptyState({
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

function CategoryTableSkeleton() {
	return (
		<div className="grid gap-3">
			{Array.from({ length: 5 }).map((_, index) => (
				<Skeleton className="h-11 w-full" key={index.toString()} />
			))}
		</div>
	);
}
