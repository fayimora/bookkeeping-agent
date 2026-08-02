import { makeNodeTelemetryLayer } from '@bookeeping-agent/telemetry/node';

export const WebTelemetryLive = makeNodeTelemetryLayer({
	serviceName: 'bookkeeping-web',
});
