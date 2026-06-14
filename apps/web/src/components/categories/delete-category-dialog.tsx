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

import type { Category } from './types';

export function DeleteCategoryDialog({
	category,
	onConfirm,
	onOpenChange,
}: {
	category: Category | null;
	onConfirm: (category: Category) => void;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<AlertDialog onOpenChange={onOpenChange} open={Boolean(category)}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete category?</AlertDialogTitle>
					<AlertDialogDescription>
						Expenses using {category ? category.name : 'this category'} will
						keep their records, but the category will be removed.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
					<AlertDialogActionButton
						onClick={() => {
							if (category) {
								onConfirm(category);
							}
						}}
					>
						Delete category
					</AlertDialogActionButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
