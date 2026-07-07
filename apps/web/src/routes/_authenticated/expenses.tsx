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
import { type FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DeleteExpenseDialog } from '../../components/expenses/delete-expense-dialog';
import { ExpenseDialog } from '../../components/expenses/expense-dialog';
import { ExpenseTableState } from '../../components/expenses/expense-table';
import {
	type Expense,
	type ExpenseFormValues,
	emptyFormValues,
	NO_CATEGORY_VALUE,
} from '../../components/expenses/types';
import {
	centsToDecimal,
	toExpenseInput,
} from '../../components/expenses/utils';
import { listCategories } from '../../server/categories';
import {
	createExpense,
	deleteExpense,
	listExpenses,
	updateExpense,
} from '../../server/expenses';

export const Route = createFileRoute('/_authenticated/expenses')({
	component: ExpensesPage,
});

function ExpensesPage() {
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
	const [formValues, setFormValues] =
		useState<ExpenseFormValues>(emptyFormValues);
	const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

	const categoriesQuery = useQuery({
		queryFn: async () => await listCategories(),
		queryKey: ['categories'],
	});

	const expensesQuery = useQuery({
		queryFn: async () => await listExpenses({ data: {} }),
		queryKey: ['expenses'],
	});

	const categoriesById = useMemo(
		() =>
			new Map(
				(categoriesQuery.data ?? []).map((category) => [category.id, category])
			),
		[categoriesQuery.data]
	);

	const invalidateExpenses = async () => {
		await queryClient.invalidateQueries({ queryKey: ['expenses'] });
	};

	const createMutation = useMutation({
		mutationFn: async (values: ExpenseFormValues) =>
			await createExpense({ data: toExpenseInput(values) }),
		onError: () => toast.error('Could not add expense'),
		onSuccess: async () => {
			await invalidateExpenses();
			setDialogOpen(false);
			toast.success('Expense added');
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			values,
		}: {
			id: string;
			values: ExpenseFormValues;
		}) =>
			await updateExpense({
				data: {
					id,
					input: toExpenseInput(values),
				},
			}),
		onError: () => toast.error('Could not update expense'),
		onSuccess: async () => {
			await invalidateExpenses();
			setDialogOpen(false);
			setEditingExpense(null);
			toast.success('Expense updated');
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (expense: Expense) =>
			await deleteExpense({ data: { id: expense.id } }),
		onError: () => toast.error('Could not delete expense'),
		onSuccess: async () => {
			await invalidateExpenses();
			setExpenseToDelete(null);
			toast.success('Expense deleted');
		},
	});

	const openCreateDialog = () => {
		setEditingExpense(null);
		setFormValues(emptyFormValues());
		setDialogOpen(true);
	};

	const openEditDialog = (expense: Expense) => {
		setEditingExpense(expense);
		setFormValues({
			amount: centsToDecimal(expense.amountCents),
			categoryId: expense.categoryId ?? NO_CATEGORY_VALUE,
			currency: expense.currency,
			date: expense.date,
			description: expense.description ?? '',
			vendor: expense.vendor,
		});
		setDialogOpen(true);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (editingExpense) {
			updateMutation.mutate({ id: editingExpense.id, values: formValues });
			return;
		}

		createMutation.mutate(formValues);
	};

	const expenses = expensesQuery.data ?? [];
	const isSaving = createMutation.isPending || updateMutation.isPending;

	return (
		<main className="min-h-0 overflow-auto px-4 py-6 md:px-8">
			<div className="mx-auto flex max-w-6xl flex-col gap-6">
				<section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="max-w-2xl">
						<h1 className="font-semibold text-2xl tracking-tight">Expenses</h1>
						<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
							Record spending by vendor, date, amount, and category.
						</p>
					</div>
					<Button onClick={openCreateDialog} type="button">
						<PlusIcon data-icon="inline-start" />
						Add expense
					</Button>
				</section>

				<Card>
					<CardHeader>
						<CardTitle>Ledger</CardTitle>
						<CardDescription>
							Your confirmed expenses, newest first.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ExpenseTableState
							categoriesById={categoriesById}
							expenses={expenses}
							hasError={expensesQuery.isError || categoriesQuery.isError}
							isLoading={expensesQuery.isPending || categoriesQuery.isPending}
							onCreate={openCreateDialog}
							onDelete={setExpenseToDelete}
							onEdit={openEditDialog}
						/>
					</CardContent>
				</Card>
			</div>

			<ExpenseDialog
				categories={categoriesQuery.data ?? []}
				editingExpense={editingExpense}
				isSaving={isSaving}
				onChange={setFormValues}
				onOpenChange={setDialogOpen}
				onSubmit={handleSubmit}
				open={dialogOpen}
				values={formValues}
			/>

			<DeleteExpenseDialog
				expense={expenseToDelete}
				onConfirm={(expense) => deleteMutation.mutate(expense)}
				onOpenChange={(open) => {
					if (!open) {
						setExpenseToDelete(null);
					}
				}}
			/>
		</main>
	);
}
