export const supportedImageTypes: readonly [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export type SupportedImageType = (typeof supportedImageTypes)[number];

const supportedImageTypeSet: ReadonlySet<string> = new Set(supportedImageTypes);

export function isSupportedImageType(
	value: string
): value is SupportedImageType {
	return supportedImageTypeSet.has(value);
}

export const maxImageBytes = 5 * 1024 * 1024;
export const maxImageDataLength = Math.ceil(maxImageBytes / 3) * 4;
export const maxAttachments = 3;
