import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { conversationsQueryOptions } from '../../lib/queries';
import { createConversation } from '../../server/conversations';

/** Create an empty conversation, refresh the list, and open it. */
export function useCreateConversation() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => await createConversation({ data: {} }),
		onError: () => toast.error('Could not start a new chat'),
		onSuccess: async (conversation) => {
			await queryClient.invalidateQueries({
				queryKey: conversationsQueryOptions.queryKey,
			});
			await navigate({
				params: { conversationId: conversation.id },
				to: '/chat/$conversationId',
			});
		},
	});
}
