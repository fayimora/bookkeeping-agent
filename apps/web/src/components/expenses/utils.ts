import { type ExpenseFormValues, NO_CATEGORY_VALUE } from './types';

export function toExpenseInput(values: ExpenseFormValues) {
	return {
		amountCents: decimalToCents(values.amount),
		categoryId:
			values.categoryId === NO_CATEGORY_VALUE ? null : values.categoryId,
		currency: values.currency,
		date: values.date,
		description: values.description.trim() || null,
		vendor: values.vendor,
	};
}

export function decimalToCents(value: string) {
	return Math.round(Number(value) * 100);
}

export function centsToDecimal(value: number) {
	return (value / 100).toFixed(2);
}

export function formatMoney(amountCents: number, currency: string) {
	return new Intl.NumberFormat('en-GB', {
		currency,
		style: 'currency',
	}).format(amountCents / 100);
}

export function formatDate(value: string) {
	return new Intl.DateTimeFormat('en-GB', {
		dateStyle: 'medium',
	}).format(new Date(`${value}T00:00:00`));
}
