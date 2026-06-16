export const supportedImageTypes = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
] as const;

export const maxImageBytes = 5 * 1024 * 1024;
export const maxImageDataLength = Math.ceil(maxImageBytes / 3) * 4;
export const maxAttachments = 3;

export type SupportedImageType = (typeof supportedImageTypes)[number];

export function isSupportedImageType(
	value: string
): value is SupportedImageType {
	return (supportedImageTypes as readonly string[]).includes(value);
}
