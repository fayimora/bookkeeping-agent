import { Type } from '@flue/runtime';
import type { Static } from 'typebox';

export const datePattern = '^\\d{4}-\\d{2}-\\d{2}$';

export const listExpensesParameters = Type.Object({
	categoryId: Type.Optional(
		Type.String({ description: 'Category UUID to filter by.' })
	),
	categorySlug: Type.Optional(
		Type.String({
			description: 'Category slug to filter by, such as food or travel.',
			minLength: 1,
		})
	),
	from: Type.Optional(
		Type.String({
			description: 'Start date in YYYY-MM-DD format.',
			pattern: datePattern,
		})
	),
	to: Type.Optional(
		Type.String({
			description: 'End date in YYYY-MM-DD format.',
			pattern: datePattern,
		})
	),
	search: Type.Optional(
		Type.String({
			description: 'Search text for vendor or description.',
			minLength: 1,
		})
	),
});

export type ListExpensesToolInput = Static<typeof listExpensesParameters>;

export const createExpenseParameters = Type.Object({
	vendor: Type.String({
		description: 'Merchant or vendor name.',
		minLength: 1,
		maxLength: 200,
	}),
	date: Type.String({
		description: 'Expense date in YYYY-MM-DD format.',
		pattern: datePattern,
	}),
	amountCents: Type.Integer({
		description: 'Amount in minor units, for example £12.50 is 1250.',
		minimum: 1,
	}),
	currency: Type.Optional(
		Type.String({
			description: 'Three-letter currency code. Defaults to GBP.',
			minLength: 3,
			maxLength: 3,
		})
	),
	categoryId: Type.Optional(
		Type.String({ description: 'Category UUID. Use this or categorySlug.' })
	),
	categorySlug: Type.Optional(
		Type.String({
			description:
				'Category slug, such as food or travel. Use this or categoryId.',
			minLength: 1,
		})
	),
	description: Type.Optional(
		Type.String({
			description: 'Short optional note or description.',
			minLength: 1,
		})
	),
});

export type CreateExpenseToolInput = Static<typeof createExpenseParameters>;
