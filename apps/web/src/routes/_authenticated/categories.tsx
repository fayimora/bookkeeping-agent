import { Button } from '@bookeeping-agent/ui/components/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@bookeeping-agent/ui/components/card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { CategoryDialog } from '../../components/categories/category-dialog';
import { CategoryTableState } from '../../components/categories/category-table';
import { DeleteCategoryDialog } from '../../components/categories/delete-category-dialog';
import {
	type Category,
	type CategoryFormValues,
	emptyCategoryFormValues,
} from '../../components/categories/types';
import { toCategoryInput } from '../../components/categories/utils';
import {
	createCategory,
	deleteCategory,
	listCategories,
	updateCategory,
} from '../../server/categories';

export const Route = createFileRoute('/_authenticated/categories')({
	component: CategoriesPage,
});

function CategoriesPage() {
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [formValues, setFormValues] = useState<CategoryFormValues>(
		emptyCategoryFormValues
	);
	const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
		null
	);

	const categoriesQuery = useQuery({
		queryKey: ['categories'],
		queryFn: async () => await listCategories(),
	});

	const invalidateCategories = async () => {
		await queryClient.invalidateQueries({ queryKey: ['categories'] });
	};

	const createMutation = useMutation({
		mutationFn: async (values: CategoryFormValues) =>
			await createCategory({ data: toCategoryInput(values) }),
		onError: () => toast.error('Could not add category'),
		onSuccess: async () => {
			await invalidateCategories();
			setDialogOpen(false);
			toast.success('Category added');
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			values,
		}: {
			id: string;
			values: CategoryFormValues;
		}) =>
			await updateCategory({
				data: {
					id,
					input: toCategoryInput(values),
				},
			}),
		onError: () => toast.error('Could not update category'),
		onSuccess: async () => {
			await invalidateCategories();
			setDialogOpen(false);
			setEditingCategory(null);
			toast.success('Category updated');
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (category: Category) =>
			await deleteCategory({ data: { id: category.id } }),
		onError: () => toast.error('Could not delete category'),
		onSuccess: async () => {
			await Promise.all([
				invalidateCategories(),
				queryClient.invalidateQueries({ queryKey: ['expenses'] }),
			]);
			setCategoryToDelete(null);
			toast.success('Category deleted');
		},
	});

	const openCreateDialog = () => {
		setEditingCategory(null);
		setFormValues(emptyCategoryFormValues());
		setDialogOpen(true);
	};

	const openEditDialog = (category: Category) => {
		setEditingCategory(category);
		setFormValues({
			name: category.name,
			slug: category.slug,
		});
		setDialogOpen(true);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (editingCategory) {
			updateMutation.mutate({ id: editingCategory.id, values: formValues });
			return;
		}

		createMutation.mutate(formValues);
	};

	const categories = categoriesQuery.data ?? [];
	const isSaving = createMutation.isPending || updateMutation.isPending;

	return (
		<main className="min-h-0 overflow-auto px-4 py-6 md:px-8">
			<div className="mx-auto flex max-w-6xl flex-col gap-6">
				<section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="max-w-2xl">
						<h1 className="font-semibold text-2xl tracking-tight">
							Categories
						</h1>
						<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
							Create and maintain the categories used to organize expenses.
						</p>
					</div>
					<Button onClick={openCreateDialog} type="button">
						<PlusIcon data-icon="inline-start" />
						Add category
					</Button>
				</section>

				<Card>
					<CardHeader>
						<CardTitle>Category list</CardTitle>
						<CardDescription>
							Keep the list short enough to stay useful.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CategoryTableState
							categories={categories}
							hasError={categoriesQuery.isError}
							isLoading={categoriesQuery.isPending}
							onCreate={openCreateDialog}
							onDelete={setCategoryToDelete}
							onEdit={openEditDialog}
						/>
					</CardContent>
				</Card>
			</div>

			<CategoryDialog
				editingCategory={editingCategory}
				isSaving={isSaving}
				onChange={setFormValues}
				onOpenChange={setDialogOpen}
				onSubmit={handleSubmit}
				open={dialogOpen}
				values={formValues}
			/>

			<DeleteCategoryDialog
				category={categoryToDelete}
				onConfirm={(category) => deleteMutation.mutate(category)}
				onOpenChange={(open) => {
					if (!open) {
						setCategoryToDelete(null);
					}
				}}
			/>
		</main>
	);
}
