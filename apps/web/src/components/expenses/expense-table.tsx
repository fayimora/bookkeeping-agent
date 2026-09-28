import { formatMoney } from '@bookeeping-agent/domain/formatting';
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
import type { Category, Expense } from './types';
import { formatDate } from './utils';

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
		return <TableSkeleton />;
	}

	if (hasError) {
		return (
			<EmptyState
				description="Check the database connection and try again."
				title="Could not load expenses"
			/>
		);
	}

	if (expenses.length === 0) {
		return (
			<EmptyState
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
						<RowActionsCell
							onDelete={() => onDelete(expense)}
							onEdit={() => onEdit(expense)}
						/>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
