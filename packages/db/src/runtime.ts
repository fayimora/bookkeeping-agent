import { Layer, ManagedRuntime } from 'effect';

import { DbLive, PgClientLive } from './database';
import {
	CategoriesRepoLive,
	ConversationsRepoLive,
	ExpensesRepoLive,
} from './repositories';

const RepositoryServicesLive = Layer.mergeAll(
	CategoriesRepoLive,
	ConversationsRepoLive,
	ExpensesRepoLive
).pipe(Layer.provide(DbLive));

/** Repository graph requiring a configured PostgreSQL client. */
export const RepositoriesLive = RepositoryServicesLive;

/** Fully configured graph used temporarily by the Promise compatibility API. */
export const RepositoryRuntimeLive = RepositoriesLive.pipe(
	Layer.provide(PgClientLive)
);

export const repositoryRuntime = ManagedRuntime.make(RepositoryRuntimeLive);
