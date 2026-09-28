// Effect-free so the web client can import it without pulling in Schema.

export function slugifyCategoryName(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function categorySlugForCreate(name: string, slug?: string) {
	return slug?.trim() || slugifyCategoryName(name);
}

export function formatMoney(amountCents: number, currency: string) {
	return new Intl.NumberFormat('en-GB', {
		currency,
		style: 'currency',
	}).format(amountCents / 100);
}
