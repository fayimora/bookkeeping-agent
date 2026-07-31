import { Layer } from 'effect';

import { DbLive } from './database';
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
