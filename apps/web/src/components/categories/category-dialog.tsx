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

import { CategoryForm } from './category-form';
import type { Category, CategoryFormValues } from './types';

export function CategoryDialog({
	editingCategory,
	isSaving,
	onChange,
	onOpenChange,
	onSubmit,
	open,
	values,
}: {
	editingCategory: Category | null;
	isSaving: boolean;
	onChange: (values: CategoryFormValues) => void;
	onOpenChange: (open: boolean) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	open: boolean;
	values: CategoryFormValues;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<form className="grid gap-5" onSubmit={onSubmit}>
					<DialogHeader>
						<DialogTitle>
							{editingCategory ? 'Edit category' : 'Add category'}
						</DialogTitle>
						<DialogDescription>
							Categories keep your expenses easier to scan and filter.
						</DialogDescription>
					</DialogHeader>

					<CategoryForm
						isEditing={Boolean(editingCategory)}
						onChange={onChange}
						values={values}
					/>

					<DialogFooter>
						<DialogClose render={<Button type="button" variant="outline" />}>
							Cancel
						</DialogClose>
						<Button disabled={isSaving} type="submit">
							{isSaving ? 'Saving...' : 'Save category'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
