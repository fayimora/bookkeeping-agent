import { PgClientLive, RepositoriesLive } from '@bookeeping-agent/db';
import { Layer, Logger, ManagedRuntime } from 'effect';

import { AgentTelemetryLive } from './telemetry';

const RepositoryServicesLive = RepositoriesLive.pipe(
	Layer.provide(PgClientLive)
);
const JsonLoggerLive = Logger.layer([Logger.consoleJson]);

/** Fully provided Effect graph shared by every agent tool invocation. */
export const AgentAppLayer = Layer.mergeAll(
	RepositoryServicesLive,
	JsonLoggerLive,
	AgentTelemetryLive
);

/** Process-wide runtime at the Flue Promise boundary. */
export const agentRuntime = ManagedRuntime.make(AgentAppLayer);
