import { createAgentRouter } from '@flue/runtime/routing';
import { Hono } from 'hono';

import './telemetry';
import { Bookkeeper } from './agents/bookkeeper';

const app = new Hono();

app.route('/agents/bookkeeper', createAgentRouter(Bookkeeper));

export default app;
