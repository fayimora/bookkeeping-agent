import { TelemetryConfig } from '@bookeeping-agent/env/telemetry';
import { layerGlobal as otelTracerLayerGlobal } from '@effect/opentelemetry/OtelTracer';
import { layer as otelResourceLayer } from '@effect/opentelemetry/Resource';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Config, Effect, Layer } from 'effect';

const telemetryConfig = Effect.runSync(Config.all(TelemetryConfig));
const startedKeyPrefix = '@bookeeping-agent/telemetry/started/';

export interface NodeTelemetryOptions {
	readonly initialize?: () => void;
	readonly serviceName: string;
}

/** Starts local OTel once per service and returns its Effect tracer bridge. */
export function makeNodeTelemetryLayer(options: NodeTelemetryOptions) {
	if (!telemetryConfig.disabled) {
		const startedKey = Symbol.for(`${startedKeyPrefix}${options.serviceName}`);

		if (Reflect.get(globalThis, startedKey) !== true) {
			const sdk = new NodeSDK({
				serviceName: options.serviceName,
				traceExporter: new OTLPTraceExporter({
					url: telemetryConfig.tracesEndpoint.toString(),
				}),
			});

			sdk.start();
			Reflect.set(globalThis, startedKey, true);
		}

		options.initialize?.();
	}

	return otelTracerLayerGlobal.pipe(
		Layer.provide(otelResourceLayer({ serviceName: options.serviceName }))
	);
}
