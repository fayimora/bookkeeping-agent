import { currentOtelSpan } from '@effect/opentelemetry/OtelTracer';
import { context, propagation, trace } from '@opentelemetry/api';
import { Effect } from 'effect';

/** Injects the complete active W3C trace carrier for an outgoing request. */
export const currentTraceHeaders = currentOtelSpan.pipe(
	Effect.map((span) => {
		const headers: Record<string, string> = {};
		propagation.inject(trace.setSpan(context.active(), span), headers);
		return headers;
	})
);
