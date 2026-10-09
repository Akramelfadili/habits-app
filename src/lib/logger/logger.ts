import { formatISO } from "date-fns";

/**
 * App-wide logger (audit A3-10): levels, a console mirror in development and an
 * in-memory ring buffer of the last `MAX_ENTRIES` entries that "Copy
 * diagnostics" reads. Memory only — nothing is written to disk (a persistent
 * log is deferred, see docs/backlog.md).
 *
 * Privacy is enforced here, not left to callers:
 * - `message` is a static string written in code, never built from user text.
 * - `context` values are numbers, booleans or null — ids and counts. Any other
 *   value (a string could be a habit name) is dropped, not echoed.
 * - An error's `message` is capped and has its quoted segments removed
 *   (`Category "Glass of water" is missing` → `Category "…" is missing`).
 *   Unquoted interpolation can't be detected, so: never put user text into an
 *   Error message — use the id.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, number | boolean | null | undefined>;

export type SerializedError = {
	name: string;
	code?: string | number;
	message: string;
	stack?: string;
	cause?: SerializedError;
};

export type LogEntry = {
	/** Epoch milliseconds. */
	at: number;
	level: LogLevel;
	scope: string;
	message: string;
	context?: Record<string, number | boolean | null>;
	error?: SerializedError;
};

export const MAX_ENTRIES = 200;
export const MAX_MESSAGE_LENGTH = 160;
const MAX_STACK_LENGTH = 600;
const MAX_CAUSE_DEPTH = 2;

const QUOTED_SEGMENT = /(["'`‘“])[^"'`’”]*(["'`’”])/g;

function scrubMessage(raw: string): string {
	// Drizzle's "Failed query: <sql>\nparams: <values>" carries the written
	// values unquoted (a habit or category name) — keep the SQL, drop the params.
	const withoutParams = raw.split(/\r?\nparams:/i)[0];
	const scrubbed = withoutParams.replace(QUOTED_SEGMENT, "$1…$2");
	return scrubbed.length > MAX_MESSAGE_LENGTH
		? `${scrubbed.slice(0, MAX_MESSAGE_LENGTH)}…`
		: scrubbed;
}

/** Only the `at …` frames — the stack's first line repeats the unscrubbed message. */
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
		// A thrown string/object can carry anything — keep only that it happened.
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

function safeContext(
	context: LogContext | undefined,
): LogEntry["context"] | undefined {
	if (!context) return undefined;
	const safe: Record<string, number | boolean | null> = {};
	for (const [key, value] of Object.entries(context)) {
		if (
			typeof value === "number" ||
			typeof value === "boolean" ||
			value === null
		) {
			safe[key] = value;
		}
	}
	return Object.keys(safe).length > 0 ? safe : undefined;
}

let entries: LogEntry[] = [];
/** Errors already recorded — the same object reported twice (hook, then boundary) is logged once. */
let reported = new WeakSet<object>();

const consoleEnabled = __DEV__ && process.env.NODE_ENV !== "test";

function write(
	level: LogLevel,
	scope: string,
	message: string,
	error?: unknown,
	context?: LogContext,
): void {
	if (error instanceof Error) {
		if (reported.has(error)) return;
		reported.add(error);
	}
	const entry: LogEntry = {
		at: Date.now(),
		level,
		scope,
		message: message.slice(0, MAX_MESSAGE_LENGTH),
	};
	const safe = safeContext(context);
	if (safe) entry.context = safe;
	const serialized = serializeError(error);
	if (serialized) entry.error = serialized;

	// Release builds keep info and up; debug is console-only.
	if (level !== "debug" || consoleEnabled) {
		entries.push(entry);
		if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
	}
	if (consoleEnabled) {
		// console.log for every level: console.error/warn would raise React
		// Native's LogBox toast over the app for an error that is already handled.
		console.log(`[${level}] [${scope}] ${message}`, error ?? "", safe ?? "");
	}
}

export const log = {
	debug: (scope: string, message: string, context?: LogContext) =>
		write("debug", scope, message, undefined, context),
	info: (scope: string, message: string, context?: LogContext) =>
		write("info", scope, message, undefined, context),
	warn: (
		scope: string,
		message: string,
		error?: unknown,
		context?: LogContext,
	) => write("warn", scope, message, error, context),
	error: (
		scope: string,
		message: string,
		error?: unknown,
		context?: LogContext,
	) => write("error", scope, message, error, context),
};

/** Oldest first. */
export function getLogEntries(): readonly LogEntry[] {
	return entries;
}

/** Whether `log` has already recorded this exact error object. */
export function wasLogged(error: unknown): boolean {
	return typeof error === "object" && error !== null && reported.has(error);
}

export function clearLog(): void {
	entries = [];
	reported = new WeakSet();
}

export function formatEntry(entry: LogEntry): string {
	const time = formatISO(entry.at);
	const parts = [
		`${time} ${entry.level.toUpperCase()} [${entry.scope}] ${entry.message}`,
	];
	if (entry.context) parts.push(JSON.stringify(entry.context));
	if (entry.error) {
		const { name, code, message } = entry.error;
		parts.push(`${name}${code !== undefined ? ` (${code})` : ""}: ${message}`);
		if (entry.error.cause) {
			parts.push(
				`caused by ${entry.error.cause.name}: ${entry.error.cause.message}`,
			);
		}
		if (entry.error.stack) parts.push(entry.error.stack);
	}
	return parts.join("\n  ");
}
