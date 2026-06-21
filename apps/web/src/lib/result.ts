import {
	Result,
	ResultDeserializationError,
	type SerializedResult,
} from 'better-result';

interface SerializedAppError {
	_tag?: string;
	message?: string;
	resource?: string;
}

type OkValue<V> =
	Extract<V, { status: 'ok' }> extends { value: infer T } ? T : never;

/**
 * Success payload of a server function that returns a serialized Result.
 * Lets client code derive types from the API surface instead of importing
 * the db package directly.
 */
export type ServerResultData<Fn extends (...args: never[]) => unknown> =
	OkValue<Awaited<ReturnType<Fn>>>;

/**
 * Rehydrates a serialized server Result and returns its value, throwing the
 * server-provided message on error. The server already scrubs messages to a
 * safe public form (see `serializeResult`), so we surface them verbatim.
 */
export function unwrapServerResult<
	V extends SerializedResult<unknown, unknown>,
>(value: V): OkValue<V> {
	const result = Result.deserialize<OkValue<V>, SerializedAppError>(value);

	if (result.isOk()) {
		return result.value;
	}

	if (ResultDeserializationError.is(result.error)) {
		throw new Error('Received an invalid server response.');
	}

	throw new Error(result.error.message ?? 'Something went wrong.');
}

export function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}
