import { createFileRoute, Outlet } from '@tanstack/react-router';

import { ChatSidebar } from '../../components/chat/chat-sidebar';

export const Route = createFileRoute('/_authenticated/chat')({
	component: ChatLayout,
});

function ChatLayout() {
	return (
		<div className="grid min-h-0 grid-cols-[16rem_minmax(0,1fr)] md:grid-cols-[18rem_minmax(0,1fr)]">
			<ChatSidebar />
			<Outlet />
		</div>
	);
}
