import type { Message } from '@bookeeping-agent/domain';

/** Client wire shape for a message; shared so listMessages and chat replies can't drift. */
export function serializeMessage(message: Message) {
	return {
		...message,
		attachmentNames:
			message.attachmentNames === null
				? null
				: Array.from(message.attachmentNames),
	};
}
