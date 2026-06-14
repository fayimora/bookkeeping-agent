import { Button } from '@bookeeping-agent/ui/components/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@bookeeping-agent/ui/components/dialog';
import type { FormEvent } from 'react';

import { ExpenseForm } from './expense-form';
import type { Category, Expense, ExpenseFormValues } from './types';

export function ExpenseDialog({
	categories,
	editingExpense,
	isSaving,
	onChange,
	onOpenChange,
	onSubmit,
	open,
	values,
}: {
	categories: Category[];
	editingExpense: Expense | null;
	isSaving: boolean;
	onChange: (values: ExpenseFormValues) => void;
	onOpenChange: (open: boolean) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	open: boolean;
	values: ExpenseFormValues;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<form className="grid gap-5" onSubmit={onSubmit}>
					<DialogHeader>
						<DialogTitle>
							{editingExpense ? 'Edit expense' : 'Add expense'}
						</DialogTitle>
						<DialogDescription>
							Save a confirmed ledger entry. You can adjust it later.
						</DialogDescription>
					</DialogHeader>

					<ExpenseForm
						categories={categories}
						onChange={onChange}
						values={values}
					/>

					<DialogFooter>
						<DialogClose render={<Button type="button" variant="outline" />}>
							Cancel
						</DialogClose>
						<Button disabled={isSaving} type="submit">
							{isSaving ? 'Saving...' : 'Save expense'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
