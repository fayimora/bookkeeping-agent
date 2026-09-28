import { Button } from '@bookeeping-agent/ui/components/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@bookeeping-agent/ui/components/table';

import { EmptyState, RowActionsCell, TableSkeleton } from '../table-states';
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
		return <TableSkeleton />;
	}

	if (hasError) {
		return (
			<EmptyState
				description="Check the database connection and try again."
				title="Could not load categories"
			/>
		);
	}

	if (categories.length === 0) {
		return (
			<EmptyState
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
						<RowActionsCell
							onDelete={() => onDelete(category)}
							onEdit={() => onEdit(category)}
						/>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
