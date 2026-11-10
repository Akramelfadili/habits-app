import type { LogEntry, LogFields, SerializedError } from "./types";

// Done in the core before any sink sees an entry, so a new sink cannot leak what an old one would not.
// A field survives only if its NAME is allowlisted; adding one is a deliberate, reviewable step.
// Quoted segments of an error message are stripped, but unquoted interpolation can't be detected:
// never put user text into an Error message; use the id.
const NUMERIC_FIELDS: ReadonlySet<string> = new Set([
	"habitId",
	"categoryId",
	"reminderId",
	"count",
	"scheduled",
	"cancelled",
	"resynced",
	"pending",
	"neededBytes",
	"bytes",
	"schemaVersion",
	"durationMs",
	"isFatal",
	"attempt",
	"index",
	"total",
	"version",
	"withReminders",
]);

const TOKEN_FIELDS: ReadonlySet<string> = new Set([
	"scope",
	"reason",
	"kind",
	"plan",
	"source",
	"step",
	"why",
	"status",
	"errorName",
]);

export const MAX_MESSAGE_LENGTH = 160;
const MAX_STACK_LENGTH = 600;
const MAX_CAUSE_DEPTH = 2;
const TOKEN = /^[a-z0-9][a-z0-9_.:-]{0,39}$/;
export const REDACTED = "[redacted]";

const QUOTED_SEGMENT = /(["'`‘“])[^"'`’”]*(["'`’”])/g;

function scrubMessage(raw: string): string {
	// Drizzle's "Failed query: <sql>\nparams: <values>" carries written values unquoted (a habit
	// name): keep the SQL, drop the params. `?? raw` only satisfies the type.
	const withoutParams = raw.split(/\r?\nparams:/i)[0] ?? raw;
	const scrubbed = withoutParams.replace(QUOTED_SEGMENT, "$1…$2");
	return scrubbed.length > MAX_MESSAGE_LENGTH
		? `${scrubbed.slice(0, MAX_MESSAGE_LENGTH)}…`
		: scrubbed;
}

// The stack's first line repeats the unscrubbed message, so only the `at …` frames are kept.
function framesOf(stack: string | undefined): string | undefined {
	if (!stack) return undefined;
	const frames = stack
		.split("\n")
		.filter((line) => /^\s*at\s/.test(line))
		.join("\n");
	return frames || undefined;
}

export function serializeError(
	error: unknown,
	depth = 0,
): SerializedError | undefined {
	if (error === undefined || error === null) return undefined;
	if (!(error instanceof Error)) {
		// A thrown string/object can carry anything: keep only that it happened.
		return { name: "NonError", message: `thrown ${typeof error}` };
	}
	const code = (error as { code?: unknown }).code;
	const serialized: SerializedError = {
		name: error.name,
		message: scrubMessage(error.message),
	};
	if (typeof code === "string" || typeof code === "number") {
		serialized.code = typeof code === "string" ? scrubMessage(code) : code;
	}
	const frames = framesOf(error.stack);
	if (frames) serialized.stack = frames.slice(0, MAX_STACK_LENGTH);
	if (error.cause !== undefined && depth < MAX_CAUSE_DEPTH) {
		serialized.cause = serializeError(error.cause, depth + 1);
	}
	return serialized;
}

export function redactFields(
	fields: LogFields | undefined,
): LogEntry["fields"] {
	if (!fields) return undefined;
	const safe: NonNullable<LogEntry["fields"]> = {};
	for (const [key, value] of Object.entries(fields)) {
		if (NUMERIC_FIELDS.has(key)) {
			if (
				typeof value === "number" ||
				typeof value === "boolean" ||
				value === null
			) {
				safe[key] = value;
			}
		} else if (TOKEN_FIELDS.has(key)) {
			if (typeof value === "string") {
				safe[key] = TOKEN.test(value) ? value : REDACTED;
			} else if (typeof value === "number" || typeof value === "boolean") {
				safe[key] = value;
			}
		}
	}
	return Object.keys(safe).length > 0 ? safe : undefined;
}
