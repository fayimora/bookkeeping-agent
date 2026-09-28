// The Flue agent instance id is a composite `${userId}::${conversationId}` so
// each chat thread gets its own isolated session/memory while tools stay
// scoped to the user.
const separator = '::';

export function makeAgentInstanceId(userId: string, conversationId: string) {
	return `${userId}${separator}${conversationId}`;
}

/** A plain id (no `::`) falls back to the whole string for backwards compatibility. */
export function parseAgentInstanceUserId(instanceId: string) {
	return instanceId.split(separator)[0] ?? instanceId;
}
