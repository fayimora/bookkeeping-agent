import {
	AddMessageInput,
	CreateCategoryInput,
	CreateConversationInput,
	CreateExpenseInput,
	ExpenseId,
	ListExpensesFilters,
	RenameConversationInput,
	UpdateExpenseInput,
	UserId,
} from '@bookeeping-agent/domain';
import { assert, describe, layer } from '@effect/vitest';
import { eq } from 'drizzle-orm';
import { ConfigProvider, Effect, Layer, Schema } from 'effect';

import { Database, DbLive, PgClientLive } from '#db/database';
import {
	CategoriesRepo,
	ConversationsRepo,
	ExpensesRepo,
} from '#db/repositories';
import { RepositoriesLive } from '#db/runtime';
import { expenses, users } from '#db/schema';

const databaseUrl =
	'postgresql://postgres:password@localhost:5434/bookeeping-agent';

const TestConfigLive = ConfigProvider.layer(
	ConfigProvider.fromUnknown({ DATABASE_URL: databaseUrl })
);
const TestPgClientLive = PgClientLive.pipe(Layer.provide(TestConfigLive));
const TestRepositoriesLive = Layer.mergeAll(RepositoriesLive, DbLive).pipe(
	Layer.provide(TestPgClientLive)
);

const makeUser = Effect.fn('Test.makeUser')(function* (label: string) {
	const db = yield* Database;
	const suffix = crypto.randomUUID();
	const userId = yield* Schema.decodeUnknownEffect(UserId)(
		`repo-test-${label}-${suffix}`
	);

	yield* db.insert(users).values({
		email: `${label}-${suffix}@example.test`,
		emailVerified: true,
		id: userId,
		name: `Repository test ${label}`,
	});

	yield* Effect.addFinalizer(() =>
		db.delete(users).where(eq(users.id, userId)).pipe(Effect.ignore)
	);

	return userId;
});

describe('Effect repositories', () => {
	layer(TestRepositoriesLive)((it) => {
		it.effect('performs category and expense CRUD with typed misses', () =>
			Effect.gen(function* () {
				const userId = yield* makeUser('expense-crud');
				const categories = yield* CategoriesRepo;
				const expenseRepo = yield* ExpensesRepo;
				const categoryInput = yield* Schema.decodeUnknownEffect(
					CreateCategoryInput
				)({ name: 'Meals', slug: 'meals' });
				const category = yield* categories.create(userId, categoryInput);

				const createInput = yield* Schema.decodeUnknownEffect(
					CreateExpenseInput
				)({
					amountCents: 1250,
					categoryId: category.id,
					currency: 'gbp',
					date: '2026-07-20',
					description: 'Lunch',
					vendor: 'Cafe',
				});
				const created = yield* expenseRepo.create(userId, createInput);
				assert.strictEqual(created.currency, 'GBP');

				const loaded = yield* expenseRepo.getById(userId, created.id);
				assert.strictEqual(loaded.id, created.id);

				const updateInput = yield* Schema.decodeUnknownEffect(
					UpdateExpenseInput
				)({ vendor: 'Updated Cafe' });
				const updated = yield* expenseRepo.update(
					userId,
					created.id,
					updateInput
				);
				assert.strictEqual(updated.vendor, 'Updated Cafe');

				const filters = yield* Schema.decodeUnknownEffect(ListExpensesFilters)({
					categoryId: category.id,
				});
				const listed = yield* expenseRepo.list(userId, filters);
				assert.strictEqual(listed.length, 1);

				yield* expenseRepo.delete(userId, created.id);
				const error = yield* Effect.flip(
					expenseRepo.getById(userId, created.id)
				);
				assert.strictEqual(error._tag, 'ExpenseNotFound');
			})
		);

		it.effect(
			'rolls back an expense create for a category owned by another user',
			() =>
				Effect.gen(function* () {
					const ownerId = yield* makeUser('category-owner');
					const otherUserId = yield* makeUser('category-other');
					const categories = yield* CategoriesRepo;
					const expenseRepo = yield* ExpensesRepo;
					const categoryInput = yield* Schema.decodeUnknownEffect(
						CreateCategoryInput
					)({ name: 'Private', slug: 'private' });
					const category = yield* categories.create(ownerId, categoryInput);
					const createInput = yield* Schema.decodeUnknownEffect(
						CreateExpenseInput
					)({
						amountCents: 500,
						categoryId: category.id,
						date: '2026-07-20',
						vendor: 'Should roll back',
					});

					const error = yield* Effect.flip(
						expenseRepo.create(otherUserId, createInput)
					);
					assert.strictEqual(error._tag, 'CategoryNotOwned');

					const filters = yield* Schema.decodeUnknownEffect(
						ListExpensesFilters
					)({});
					const otherExpenses = yield* expenseRepo.list(otherUserId, filters);
					assert.strictEqual(otherExpenses.length, 0);
				})
		);

		it.effect('adds messages transactionally and rejects non-owners', () =>
			Effect.gen(function* () {
				const userId = yield* makeUser('conversation-owner');
				const otherUserId = yield* makeUser('conversation-other');
				const conversations = yield* ConversationsRepo;
				const createInput = yield* Schema.decodeUnknownEffect(
					CreateConversationInput
				)({});
				const conversation = yield* conversations.create(userId, createInput);
				const originalLastMessageAt = conversation.lastMessageAt;
				const messageInput = yield* Schema.decodeUnknownEffect(AddMessageInput)(
					{
						attachmentNames: ['receipt.png'],
						content: 'Hello',
						role: 'user',
					}
				);

				const message = yield* conversations.addMessage(
					userId,
					conversation.id,
					messageInput
				);
				assert.strictEqual(message.content, 'Hello');

				const storedMessages = yield* conversations.listMessages(
					userId,
					conversation.id
				);
				assert.strictEqual(storedMessages.length, 1);

				const updatedConversation = yield* conversations.getById(
					userId,
					conversation.id
				);
				assert.isAtLeast(
					updatedConversation.lastMessageAt.getTime(),
					originalLastMessageAt.getTime()
				);

				const error = yield* Effect.flip(
					conversations.listMessages(otherUserId, conversation.id)
				);
				assert.strictEqual(error._tag, 'ConversationNotOwned');

				const renameInput = yield* Schema.decodeUnknownEffect(
					RenameConversationInput
				)({ title: 'Renamed' });
				const renamed = yield* conversations.rename(
					userId,
					conversation.id,
					renameInput
				);
				assert.strictEqual(renamed.title, 'Renamed');
			})
		);

		it.effect('maps malformed persisted rows to DbError', () =>
			Effect.gen(function* () {
				const db = yield* Database;
				const userId = yield* makeUser('malformed-row');
				const expenseRepo = yield* ExpensesRepo;
				const malformedId = yield* Schema.decodeUnknownEffect(ExpenseId)(
					crypto.randomUUID()
				);

				yield* db.insert(expenses).values({
					amountCents: -1,
					currency: 'GBP',
					date: '2026-07-20',
					id: malformedId,
					userId,
					vendor: 'Malformed',
				});

				const filters = yield* Schema.decodeUnknownEffect(ListExpensesFilters)(
					{}
				);
				const error = yield* Effect.flip(expenseRepo.list(userId, filters));
				assert.strictEqual(error._tag, 'DbError');
				if (error._tag === 'DbError') {
					assert.strictEqual(error.operation, 'ExpensesRepo.list.decode');
				}
			})
		);

		it.effect('fails empty updates before issuing SQL', () =>
			Effect.gen(function* () {
				const userId = yield* makeUser('empty-update');
				const expenseRepo = yield* ExpensesRepo;
				const expenseId = yield* Schema.decodeUnknownEffect(ExpenseId)(
					crypto.randomUUID()
				);
				const empty = yield* Schema.decodeUnknownEffect(UpdateExpenseInput)({});
				const error = yield* Effect.flip(
					expenseRepo.update(userId, expenseId, empty)
				);
				assert.strictEqual(error._tag, 'EmptyUpdate');
			})
		);
	});
});
