// biome-ignore-all lint/style/useFilenamingConvention: TanStack Router requires the $conversationId dynamic-segment filename to derive the route param.
import { createFileRoute } from '@tanstack/react-router';

import { ChatShell } from '../../../components/chat/chat-shell';

export const Route = createFileRoute('/_authenticated/chat/$conversationId')({
	component: ChatConversation,
});

function ChatConversation() {
	const { conversationId } = Route.useParams();

	return <ChatShell conversationId={conversationId} />;
}
