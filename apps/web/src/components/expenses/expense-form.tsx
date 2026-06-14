import { Input } from '@bookeeping-agent/ui/components/input';
import { Label } from '@bookeeping-agent/ui/components/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@bookeeping-agent/ui/components/select';
import { Textarea } from '@bookeeping-agent/ui/components/textarea';

import {
	type Category,
	type ExpenseFormValues,
	NO_CATEGORY_VALUE,
} from './types';

export function ExpenseForm({
	categories,
	onChange,
	values,
}: {
	categories: Category[];
	onChange: (values: ExpenseFormValues) => void;
	values: ExpenseFormValues;
}) {
	const updateField = (field: keyof ExpenseFormValues, value: string) => {
		onChange({ ...values, [field]: value });
	};
	const categoryItems = [
		{ label: 'No category', value: NO_CATEGORY_VALUE },
		...categories.map((category) => ({
			label: category.name,
			value: category.id,
		})),
	];

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="grid gap-2 sm:col-span-2">
				<Label htmlFor="expense-vendor">Vendor</Label>
				<Input
					autoFocus
					id="expense-vendor"
					onChange={(event) => updateField('vendor', event.target.value)}
					placeholder="Pret, GitHub, Trainline"
					required
					value={values.vendor}
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="expense-date">Date</Label>
				<Input
					id="expense-date"
					onChange={(event) => updateField('date', event.target.value)}
					required
					type="date"
					value={values.date}
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="expense-amount">Amount</Label>
				<Input
					id="expense-amount"
					inputMode="decimal"
					min="0.01"
					onChange={(event) => updateField('amount', event.target.value)}
					placeholder="12.50"
					required
					step="0.01"
					type="number"
					value={values.amount}
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="expense-currency">Currency</Label>
				<Input
					id="expense-currency"
					maxLength={3}
					onChange={(event) => updateField('currency', event.target.value)}
					required
					value={values.currency}
				/>
			</div>

			<div className="grid gap-2">
				<Label>Category</Label>
				<Select
					items={categoryItems}
					onValueChange={(value) =>
						updateField('categoryId', value ?? NO_CATEGORY_VALUE)
					}
					value={values.categoryId}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Choose category" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={NO_CATEGORY_VALUE}>No category</SelectItem>
						{categories.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								{category.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-2 sm:col-span-2">
				<Label htmlFor="expense-description">Description</Label>
				<Textarea
					id="expense-description"
					onChange={(event) => updateField('description', event.target.value)}
					placeholder="Optional note"
					value={values.description}
				/>
			</div>
		</div>
	);
}
