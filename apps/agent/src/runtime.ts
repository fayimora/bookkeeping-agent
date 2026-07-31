import { PgClientLive, RepositoriesLive } from '@bookeeping-agent/db';
import { Layer, Logger, ManagedRuntime } from 'effect';

const JsonLoggerLive = Logger.layer([Logger.consoleJson]);

/** Fully provided Effect graph shared by every agent tool invocation. */
export const AgentAppLayer = RepositoriesLive.pipe(
	Layer.provide(PgClientLive),
	Layer.provide(JsonLoggerLive)
);

/** Process-wide runtime at the Flue Promise boundary. */
export const agentRuntime = ManagedRuntime.make(AgentAppLayer);
