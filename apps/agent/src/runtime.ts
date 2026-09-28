import { RepositoriesPgLive } from '@bookeeping-agent/db';
import { Layer, Logger, ManagedRuntime } from 'effect';

import { AgentTelemetryLive } from './telemetry';

const JsonLoggerLive = Logger.layer([Logger.consoleJson]);

/** Fully provided Effect graph shared by every agent tool invocation. */
export const AgentAppLayer = Layer.mergeAll(
	RepositoriesPgLive,
	JsonLoggerLive,
	AgentTelemetryLive
);

/** Process-wide runtime at the Flue Promise boundary. */
export const agentRuntime = ManagedRuntime.make(AgentAppLayer);
