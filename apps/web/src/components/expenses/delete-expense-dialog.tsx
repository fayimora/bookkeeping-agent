import {
	AlertDialog,
	AlertDialogActionButton,
	AlertDialogCancelButton,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@bookeeping-agent/ui/components/alert-dialog';

import type { Expense } from './types';

export function DeleteExpenseDialog({
	expense,
	onConfirm,
	onOpenChange,
}: {
	expense: Expense | null;
	onConfirm: (expense: Expense) => void;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<AlertDialog onOpenChange={onOpenChange} open={Boolean(expense)}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete expense?</AlertDialogTitle>
					<AlertDialogDescription>
						This will permanently remove{' '}
						{expense ? expense.vendor : 'this expense'}
						from your ledger.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
					<AlertDialogActionButton
						onClick={() => {
							if (expense) {
								onConfirm(expense);
							}
						}}
					>
						Delete expense
					</AlertDialogActionButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
