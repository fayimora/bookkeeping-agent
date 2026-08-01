import { createAgentRouter } from '@flue/runtime/routing';
import { Hono } from 'hono';

import { Bookkeeper } from './agents/bookkeeper.ts';

const app = new Hono();

app.route('/agents/bookkeeper', createAgentRouter(Bookkeeper));

export default app;
