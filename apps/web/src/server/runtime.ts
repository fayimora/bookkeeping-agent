import { PgClientLive, RepositoriesLive } from '@bookeeping-agent/db';
import { Layer, ManagedRuntime } from 'effect';

import { BetterAuthLive } from './auth';
import { BookkeeperClientLive } from './bookkeeper-client';

const RepositoryServicesLive = RepositoriesLive.pipe(
	Layer.provide(PgClientLive)
);

/** Fully provided Effect graph shared by every web-server request. */
export const WebAppLayer = Layer.mergeAll(
	RepositoryServicesLive,
	BetterAuthLive,
	BookkeeperClientLive
);

/** Process-wide runtime at the TanStack Promise boundary. */
export const webRuntime = ManagedRuntime.make(WebAppLayer);

if (import.meta.hot) {
	import.meta.hot.dispose(() => webRuntime.dispose());
}
