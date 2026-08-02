import { PgClientLive, RepositoriesLive } from '@bookeeping-agent/db';
import { Layer, Logger, ManagedRuntime } from 'effect';

import { BetterAuthLive } from './auth';
import { BookkeeperClientLive } from './bookkeeper-client';
import { WebTelemetryLive } from './telemetry';

const RepositoryServicesLive = RepositoriesLive.pipe(
	Layer.provide(PgClientLive)
);
const JsonLoggerLive = Logger.layer([Logger.consoleJson]);

/** Fully provided Effect graph shared by every web-server request. */
export const WebAppLayer = Layer.mergeAll(
	RepositoryServicesLive,
	BetterAuthLive,
	BookkeeperClientLive,
	JsonLoggerLive,
	WebTelemetryLive
);

/** Process-wide runtime at the TanStack Promise boundary. */
export const webRuntime = ManagedRuntime.make(WebAppLayer);

if (import.meta.hot) {
	import.meta.hot.dispose(() => webRuntime.dispose());
}
