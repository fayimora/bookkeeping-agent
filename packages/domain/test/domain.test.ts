import { assert, describe, it } from '@effect/vitest';
import { Effect, Schema } from 'effect';

import {
	AddMessageInput,
	AmountCents,
	Category,
	CategoryId,
	ChatImage,
	Conversation,
	ConversationId,
	CreateCategoryInput,
	CreateConversationInput,
	CreateExpenseInput,
	Currency,
	Expense,
	ExpenseId,
	IsoDate,
	ListExpensesFilters,
	Message,
	MessageId,
	RenameConversationInput,
	SendChatMessageInput,
	UpdateCategoryInput,
	UpdateExpenseInput,
	UserId,
} from '../src/index';

const userId = 'user-1';
const expenseId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const conversationId = '33333333-3333-4333-8333-333333333333';
const messageId = '44444444-4444-4444-8444-444444444444';
const createdAt = new Date('2026-07-19T10:00:00.000Z');
const updatedAt = new Date('2026-07-19T11:00:00.000Z');

const roundTripModels = Effect.gen(function* () {
	const expense = yield* Schema.decodeUnknownEffect(Expense)({
		amountCents: 1250,
		categoryId,
		createdAt,
		currency: 'GBP',
		date: '2026-07-19',
		description: 'Lunch',
		id: expenseId,
		updatedAt,
		userId,
		vendor: 'Cafe',
	});
	const encodedExpense = yield* Schema.encodeUnknownEffect(Expense)(expense);
	const decodedExpense =
		yield* Schema.decodeUnknownEffect(Expense)(encodedExpense);
	assert.deepStrictEqual(decodedExpense, expense);

	const category = yield* Schema.decodeUnknownEffect(Category)({
		createdAt,
		id: categoryId,
		name: 'Food',
		slug: 'food',
		updatedAt,
		userId,
	});
	const encodedCategory = yield* Schema.encodeUnknownEffect(Category)(category);
	const decodedCategory =
		yield* Schema.decodeUnknownEffect(Category)(encodedCategory);
	assert.deepStrictEqual(decodedCategory, category);

	const conversation = yield* Schema.decodeUnknownEffect(Conversation)({
		createdAt,
		id: conversationId,
		lastMessageAt: updatedAt,
		title: 'Receipts',
		updatedAt,
		userId,
	});
	const encodedConversation =
		yield* Schema.encodeUnknownEffect(Conversation)(conversation);
	const decodedConversation =
		yield* Schema.decodeUnknownEffect(Conversation)(encodedConversation);
	assert.deepStrictEqual(decodedConversation, conversation);

	const message = yield* Schema.decodeUnknownEffect(Message)({
		attachmentNames: ['receipt.png'],
		content: 'Please record this receipt.',
		contentHtml: null,
		conversationId,
		createdAt,
		id: messageId,
		role: 'user',
		userId,
	});
	const encodedMessage = yield* Schema.encodeUnknownEffect(Message)(message);
	const decodedMessage =
		yield* Schema.decodeUnknownEffect(Message)(encodedMessage);
	assert.deepStrictEqual(decodedMessage, message);
});

describe('domain schemas', () => {
	it.effect('round-trips persisted models', () => roundTripModels);

	it.effect('normalizes expense input and applies the currency default', () =>
		Effect.gen(function* () {
			const input = yield* Schema.decodeUnknownEffect(CreateExpenseInput)({
				amountCents: 1250,
				date: '2026-07-19',
				description: '  Team lunch  ',
				vendor: '  Cafe  ',
			});

			assert.strictEqual(input.currency, 'GBP');
			assert.strictEqual(input.description, 'Team lunch');
			assert.strictEqual(input.vendor, 'Cafe');

			const lowercaseCurrency = yield* Schema.decodeUnknownEffect(
				CreateExpenseInput
			)({
				amountCents: 1250,
				currency: ' usd ',
				date: '2026-07-19',
				vendor: 'Cafe',
			});

			assert.strictEqual(lowercaseCurrency.currency, 'USD');
		})
	);

	it.effect('rejects invalid persisted dates and image base64', () =>
		Effect.sync(() => {
			const invalidExpense = Schema.decodeUnknownResult(Expense)({
				amountCents: 1250,
				categoryId,
				createdAt: new Date('invalid'),
				currency: 'GBP',
				date: '2026-07-19',
				description: 'Lunch',
				id: expenseId,
				updatedAt,
				userId,
				vendor: 'Cafe',
			});
			assert.strictEqual(invalidExpense._tag, 'Failure');

			const invalidImage = Schema.decodeUnknownResult(ChatImage)({
				data: 'not base64!',
				mimeType: 'image/png',
				type: 'image',
			});
			assert.strictEqual(invalidImage._tag, 'Failure');
		})
	);

	it.effect.prop(
		'round-trips branded primitives',
		[
			UserId,
			ExpenseId,
			CategoryId,
			ConversationId,
			MessageId,
			Currency,
			IsoDate,
			AmountCents,
		],
		([
			generatedUserId,
			generatedExpenseId,
			generatedCategoryId,
			generatedConversationId,
			generatedMessageId,
			generatedCurrency,
			generatedIsoDate,
			generatedAmountCents,
		]) =>
			Effect.gen(function* () {
				const userIdEncoded =
					yield* Schema.encodeUnknownEffect(UserId)(generatedUserId);
				assert.strictEqual(
					yield* Schema.decodeUnknownEffect(UserId)(userIdEncoded),
					generatedUserId
				);

				const expenseIdEncoded =
					yield* Schema.encodeUnknownEffect(ExpenseId)(generatedExpenseId);
				assert.strictEqual(
					yield* Schema.decodeUnknownEffect(ExpenseId)(expenseIdEncoded),
					generatedExpenseId
				);

				const categoryIdEncoded =
					yield* Schema.encodeUnknownEffect(CategoryId)(generatedCategoryId);
				assert.strictEqual(
					yield* Schema.decodeUnknownEffect(CategoryId)(categoryIdEncoded),
					generatedCategoryId
				);

				const conversationIdEncoded = yield* Schema.encodeUnknownEffect(
					ConversationId
				)(generatedConversationId);
				assert.strictEqual(
					yield* Schema.decodeUnknownEffect(ConversationId)(
						conversationIdEncoded
					),
					generatedConversationId
				);

				const messageIdEncoded =
					yield* Schema.encodeUnknownEffect(MessageId)(generatedMessageId);
				assert.strictEqual(
					yield* Schema.decodeUnknownEffect(MessageId)(messageIdEncoded),
					generatedMessageId
				);

				const currencyEncoded =
					yield* Schema.encodeUnknownEffect(Currency)(generatedCurrency);
				assert.strictEqual(
					yield* Schema.decodeUnknownEffect(Currency)(currencyEncoded),
					generatedCurrency
				);

				const isoDateEncoded =
					yield* Schema.encodeUnknownEffect(IsoDate)(generatedIsoDate);
				assert.strictEqual(
					yield* Schema.decodeUnknownEffect(IsoDate)(isoDateEncoded),
					generatedIsoDate
				);

				const amountCentsEncoded =
					yield* Schema.encodeUnknownEffect(AmountCents)(generatedAmountCents);
				assert.strictEqual(
					yield* Schema.decodeUnknownEffect(AmountCents)(amountCentsEncoded),
					generatedAmountCents
				);
			})
	);

	it.effect.prop(
		'round-trips input schemas',
		[
			CreateExpenseInput,
			UpdateExpenseInput,
			ListExpensesFilters,
			CreateCategoryInput,
			UpdateCategoryInput,
			CreateConversationInput,
			RenameConversationInput,
			AddMessageInput,
			ChatImage,
			SendChatMessageInput,
		],
		([
			createExpense,
			updateExpense,
			listExpenses,
			createCategory,
			updateCategory,
			createConversation,
			renameConversation,
			addMessage,
			chatImage,
			sendChatMessage,
		]) =>
			Effect.gen(function* () {
				const createExpenseEncoded =
					yield* Schema.encodeUnknownEffect(CreateExpenseInput)(createExpense);
				assert.deepStrictEqual(
					yield* Schema.decodeUnknownEffect(CreateExpenseInput)(
						createExpenseEncoded
					),
					createExpense
				);

				const updateExpenseEncoded =
					yield* Schema.encodeUnknownEffect(UpdateExpenseInput)(updateExpense);
				assert.deepStrictEqual(
					yield* Schema.decodeUnknownEffect(UpdateExpenseInput)(
						updateExpenseEncoded
					),
					updateExpense
				);

				const listExpensesEncoded =
					yield* Schema.encodeUnknownEffect(ListExpensesFilters)(listExpenses);
				assert.deepStrictEqual(
					yield* Schema.decodeUnknownEffect(ListExpensesFilters)(
						listExpensesEncoded
					),
					listExpenses
				);

				const createCategoryEncoded =
					yield* Schema.encodeUnknownEffect(CreateCategoryInput)(
						createCategory
					);
				assert.deepStrictEqual(
					yield* Schema.decodeUnknownEffect(CreateCategoryInput)(
						createCategoryEncoded
					),
					createCategory
				);

				const updateCategoryEncoded =
					yield* Schema.encodeUnknownEffect(UpdateCategoryInput)(
						updateCategory
					);
				assert.deepStrictEqual(
					yield* Schema.decodeUnknownEffect(UpdateCategoryInput)(
						updateCategoryEncoded
					),
					updateCategory
				);

				const createConversationEncoded = yield* Schema.encodeUnknownEffect(
					CreateConversationInput
				)(createConversation);
				assert.deepStrictEqual(
					yield* Schema.decodeUnknownEffect(CreateConversationInput)(
						createConversationEncoded
					),
					createConversation
				);

				const renameConversationEncoded = yield* Schema.encodeUnknownEffect(
					RenameConversationInput
				)(renameConversation);
				assert.deepStrictEqual(
					yield* Schema.decodeUnknownEffect(RenameConversationInput)(
						renameConversationEncoded
					),
					renameConversation
				);

				const addMessageEncoded =
					yield* Schema.encodeUnknownEffect(AddMessageInput)(addMessage);
				assert.deepStrictEqual(
					yield* Schema.decodeUnknownEffect(AddMessageInput)(addMessageEncoded),
					addMessage
				);

				const chatImageEncoded =
					yield* Schema.encodeUnknownEffect(ChatImage)(chatImage);
				assert.deepStrictEqual(
					yield* Schema.decodeUnknownEffect(ChatImage)(chatImageEncoded),
					chatImage
				);

				const sendChatMessageEncoded =
					yield* Schema.encodeUnknownEffect(SendChatMessageInput)(
						sendChatMessage
					);
				assert.deepStrictEqual(
					yield* Schema.decodeUnknownEffect(SendChatMessageInput)(
						sendChatMessageEncoded
					),
					sendChatMessage
				);
			})
	);
});
