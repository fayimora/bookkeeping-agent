import { env } from '@bookeeping-agent/env/server';
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
		inputTokens: usage.input,
		outputTokens: usage.output,
		cacheReadTokens: usage.cacheRead,
		cacheWriteTokens: usage.cacheWrite,
		totalTokens: usage.totalTokens,
		cost: usage.cost.total,
	};
}

function serializeError(error: Error) {
	return { name: error.name, message: error.message, stack: error.stack };
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

	switch (event.type) {
		case 'agent_end':
			record.messageCount = event.messages.length;
			break;
		case 'turn_request':
			record.messageCount = event.request.input.messages.length;
			record.toolNames = event.request.input.tools?.map((tool) => tool.name);
			break;
		case 'log':
			record.message = event.message;
			break;
		default:
			break;
	}
}

function summaryRecordForEvent(event: FlueEvent) {
	const record: Record<string, unknown> = {
		service: serviceName,
		level: logLevelForEvent(event),
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
		service: serviceName,
		level: logLevelForEvent(event),
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
