import { Layer } from 'effect';

import { DbLive, PgClientLive } from './database';
import {
	CategoriesRepoLive,
	ConversationsRepoLive,
	ExpensesRepoLive,
} from './repositories';

/** Repository graph requiring a PostgreSQL client; tests provide their own. */
export const RepositoriesLive = Layer.mergeAll(
	CategoriesRepoLive,
	ConversationsRepoLive,
	ExpensesRepoLive
).pipe(Layer.provide(DbLive));

/** Repositories wired to the configured PostgreSQL client, for apps. */
export const RepositoriesPgLive = RepositoriesLive.pipe(
	Layer.provide(PgClientLive)
);
