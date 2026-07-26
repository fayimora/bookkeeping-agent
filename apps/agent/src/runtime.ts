import { PgClientLive, RepositoriesLive } from '@bookeeping-agent/db';
import { Layer, ManagedRuntime } from 'effect';

/** Fully provided Effect graph shared by every agent tool invocation. */
export const AgentAppLayer = RepositoriesLive.pipe(Layer.provide(PgClientLive));

/** Process-wide runtime at the Flue Promise boundary. */
export const agentRuntime = ManagedRuntime.make(AgentAppLayer);
