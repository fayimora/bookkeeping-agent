import { env } from '@bookeeping-agent/env/agent';
import { type FlueEvent, observe, type PromptUsage } from '@flue/runtime';

const serviceName = 'bookkeeping-agent-service';
const skippedVerboseEvents = new Set<FlueEvent['type']>([
	'text_delta',
	'thinking_delta',
]);
const summaryEvents = new Set<FlueEvent['type']>([
	'run_start',
	'run_resume',
	'run_end',
	'agent_start',
	'agent_end',
	'operation_start',
	'operation',
	'turn_start',
	'turn_request',
	'turn',
	'tool_start',
	'tool',
	'task_start',
	'task',
	'compaction_start',
	'compaction',
	'log',
	'idle',
	'submission_settled',
]);
const summaryOmittedFields = new Set([
	'args',
	'attributes',
	'content',
	'delta',
	'error',
	'input',
	'message',
	'messages',
	'output',
	'payload',
	'prompt',
	'result',
	'text',
	'toolResults',
	'usage',
]);

type ObservabilityMode = Exclude<typeof env.AGENT_OBSERVABILITY, 'off'>;

function usageSummary(usage?: PromptUsage) {
	if (!usage) {
		return;
	}

	return {
		cacheReadTokens: usage.cacheRead,
		cacheWriteTokens: usage.cacheWrite,
		cost: usage.cost.total,
		inputTokens: usage.input,
		outputTokens: usage.output,
		totalTokens: usage.totalTokens,
	};
}

function serializeError(error: Error) {
	return { message: error.message, name: error.name, stack: error.stack };
}

function errorSummary(error: unknown) {
	if (!error) {
		return;
	}

	if (error instanceof Error) {
		return serializeError(error);
	}

	return typeof error === 'string' ? error : String(error);
}

function logLevelForEvent(event: FlueEvent) {
	return event.type === 'log' ? event.level : 'info';
}

function addSummaryContext(record: Record<string, unknown>, event: FlueEvent) {
	if ('usage' in event) {
		record.usage = usageSummary(event.usage);
	}

	if ('error' in event) {
		record.error = errorSummary(event.error);
	}

	const eventType = event.type as string;

	if (eventType === 'agent_end' && 'messages' in event) {
		record.messageCount = event.messages.length;
	}

	if (eventType === 'turn_request' && 'request' in event) {
		const request = event.request as {
			input?: { messages?: unknown[]; tools?: Array<{ name: string }> };
		};

		record.messageCount = request.input?.messages?.length;
		record.toolNames = request.input?.tools?.map((tool) => tool.name);
	}

	if (eventType === 'log' && 'message' in event) {
		record.message = event.message;
	}
}

function summaryRecordForEvent(event: FlueEvent) {
	const record: Record<string, unknown> = {
		level: logLevelForEvent(event),
		service: serviceName,
	};

	for (const [key, value] of Object.entries(event)) {
		if (!summaryOmittedFields.has(key)) {
			record[key] = value;
		}
	}

	addSummaryContext(record, event);
	return record;
}

function recordForEvent(event: FlueEvent, mode: ObservabilityMode) {
	if (mode === 'summary') {
		return summaryRecordForEvent(event);
	}

	return {
		level: logLevelForEvent(event),
		service: serviceName,
		...event,
	};
}

function shouldLog(event: FlueEvent, mode: ObservabilityMode) {
	if (mode === 'verbose') {
		return !skippedVerboseEvents.has(event.type);
	}

	return summaryEvents.has(event.type);
}

function toJsonValue(_key: string, value: unknown) {
	if (value instanceof Error) {
		return serializeError(value);
	}

	if (typeof value === 'bigint') {
		return value.toString();
	}

	return value;
}

function writeLog(event: FlueEvent, mode: ObservabilityMode) {
	const level = logLevelForEvent(event);
	const line = JSON.stringify(recordForEvent(event, mode), toJsonValue);

	if (level === 'error') {
		console.error(line);
	} else if (level === 'warn') {
		console.warn(line);
	} else {
		console.info(line);
	}
}

export function registerAgentObservability() {
	const mode = env.AGENT_OBSERVABILITY;

	if (mode === 'off') {
		return;
	}

	observe((event) => {
		if (shouldLog(event, mode)) {
			writeLog(event, mode);
		}
	});
}
