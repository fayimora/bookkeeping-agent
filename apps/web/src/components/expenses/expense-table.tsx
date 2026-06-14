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

import type { Category, Expense } from './types';
import { formatDate, formatMoney } from './utils';

export function ExpenseTableState({
	categoriesById,
	expenses,
	hasError,
	isLoading,
	onCreate,
	onDelete,
	onEdit,
}: {
	categoriesById: Map<string, Category>;
	expenses: Expense[];
	hasError: boolean;
	isLoading: boolean;
	onCreate: () => void;
	onDelete: (expense: Expense) => void;
	onEdit: (expense: Expense) => void;
}) {
	if (isLoading) {
		return <ExpenseTableSkeleton />;
	}

	if (hasError) {
		return (
			<ExpenseEmptyState
				description="Check the database connection and try again."
				title="Could not load expenses"
			/>
		);
	}

	if (expenses.length === 0) {
		return (
			<ExpenseEmptyState
				action={
					<Button onClick={onCreate} size="sm" type="button">
						Add first expense
					</Button>
				}
				description="Start with one real transaction. The agent features can use this ledger later."
				title="No expenses yet"
			/>
		);
	}

	return (
		<ExpenseTable
			categoriesById={categoriesById}
			expenses={expenses}
			onDelete={onDelete}
			onEdit={onEdit}
		/>
	);
}

function ExpenseTable({
	categoriesById,
	expenses,
	onDelete,
	onEdit,
}: {
	categoriesById: Map<string, Category>;
	expenses: Expense[];
	onDelete: (expense: Expense) => void;
	onEdit: (expense: Expense) => void;
}) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Vendor</TableHead>
					<TableHead>Date</TableHead>
					<TableHead>Amount</TableHead>
					<TableHead>Category</TableHead>
					<TableHead className="hidden md:table-cell">Description</TableHead>
					<TableHead className="text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{expenses.map((expense) => (
					<TableRow key={expense.id}>
						<TableCell className="font-medium">{expense.vendor}</TableCell>
						<TableCell>{formatDate(expense.date)}</TableCell>
						<TableCell>
							{formatMoney(expense.amountCents, expense.currency)}
						</TableCell>
						<TableCell>
							{expense.categoryId
								? (categoriesById.get(expense.categoryId)?.name ?? 'Unknown')
								: 'None'}
						</TableCell>
						<TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
							{expense.description || 'No description'}
						</TableCell>
						<TableCell>
							<div className="flex justify-end gap-2">
								<Button
									onClick={() => onEdit(expense)}
									size="xs"
									type="button"
									variant="outline"
								>
									<PencilIcon data-icon="inline-start" />
									Edit
								</Button>
								<Button
									onClick={() => onDelete(expense)}
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

function ExpenseEmptyState({
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

function ExpenseTableSkeleton() {
	return (
		<div className="grid gap-3">
			{Array.from({ length: 5 }).map((_, index) => (
				<Skeleton className="h-11 w-full" key={index.toString()} />
			))}
		</div>
	);
}
