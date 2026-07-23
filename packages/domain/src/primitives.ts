import { Schema, SchemaTransformation } from 'effect';

export const TrimmedNonEmptyString = Schema.Trim.check(Schema.isNonEmpty());

export const UserId = Schema.NonEmptyString.pipe(Schema.brand('UserId'));
export type UserId = typeof UserId.Type;

const Uuid = Schema.String.check(Schema.isUUID());

export const ExpenseId = Uuid.pipe(Schema.brand('ExpenseId'));
export type ExpenseId = typeof ExpenseId.Type;

export const CategoryId = Uuid.pipe(Schema.brand('CategoryId'));
export type CategoryId = typeof CategoryId.Type;

export const ConversationId = Uuid.pipe(Schema.brand('ConversationId'));
export type ConversationId = typeof ConversationId.Type;

export const MessageId = Uuid.pipe(Schema.brand('MessageId'));
export type MessageId = typeof MessageId.Type;

export const Currency = Schema.Trim.pipe(
	Schema.decode(SchemaTransformation.toUpperCase())
)
	.check(Schema.isUppercased())
	.check(Schema.isLengthBetween(3, 3))
	.pipe(Schema.brand('Currency'));
export type Currency = typeof Currency.Type;

export const IsoDate = Schema.String.check(
	Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/)
).pipe(Schema.brand('IsoDate'));
export type IsoDate = typeof IsoDate.Type;

export const AmountCents = Schema.Int.check(Schema.isGreaterThan(0)).pipe(
	Schema.brand('AmountCents')
);
export type AmountCents = typeof AmountCents.Type;
