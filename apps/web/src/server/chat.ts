import { createServerFn } from '@tanstack/react-start';

import { sendChatMessageWorkflow } from './chat-workflow';
import { runAuthenticatedEffect } from './http';
import { SendChatMessageValidator } from './validators';

export const sendChatMessage = createServerFn({ method: 'POST' })
	.validator(SendChatMessageValidator)
	.handler(({ data }) => runAuthenticatedEffect(sendChatMessageWorkflow(data)));
