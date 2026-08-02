import { AgentConfig } from '@bookeeping-agent/env/agent';
import { makeNodeTelemetryLayer } from '@bookeeping-agent/telemetry/node';
import { createOpenTelemetryInstrumentation } from '@flue/opentelemetry';
import { instrument } from '@flue/runtime';
import { Effect } from 'effect';

const includeContent = Effect.runSync(AgentConfig.telemetryIncludeContent);

export const AgentTelemetryLive = makeNodeTelemetryLayer({
	initialize: () => {
		// Prompt, response, tool, and receipt content may contain sensitive financial
		// data. Keep it out of traces unless local debugging explicitly opts in.
		const instrumentation = includeContent
			? createOpenTelemetryInstrumentation()
			: createOpenTelemetryInstrumentation({ content: false });

		instrument(instrumentation);
	},
	serviceName: 'bookkeeping-agent',
});
