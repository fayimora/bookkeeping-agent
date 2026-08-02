import { Config } from 'effect';

const defaultMotelTracesEndpoint = new URL('http://127.0.0.1:27686/v1/traces');

/** Process-wide OpenTelemetry configuration shared by web and agent servers. */
export const TelemetryConfig = {
	disabled: Config.boolean('OTEL_SDK_DISABLED').pipe(Config.withDefault(false)),
	tracesEndpoint: Config.url('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT').pipe(
		Config.withDefault(defaultMotelTracesEndpoint)
	),
};
