import { getAppInfo } from "@/lib/diagnostics/app-info";
import { redactFields, serializeError } from "./redact";
import { createMemorySink } from "./sinks/memory-sink";
import type { LogEntry, LogFields, LogLevel, LogSink } from "./types";

/**
 * App-wide logger: `log.error("migration.failure", { schemaVersion })`, a short dot-separated
 * event name and allowlisted fields. The core redacts (redact.ts), stamps time, level and app
 * version, then hands the entry to every registered sink (sinks/). A sink or the logger itself
 * can fail; the app never sees it. See docs/decisions/008-logging.md.
 */

export const SESSION_BUFFER_SIZE = 200;

const LEVEL_ORDER: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

let minLevel: LogLevel = __DEV__ ? "debug" : "info";
const sinks = new Set<LogSink>();
/** Errors already recorded — the same object reported twice (hook, then boundary) is logged once. */
let reported = new WeakSet<object>();
const session = createMemorySink(SESSION_BUFFER_SIZE);
let versionStamp: { appVersion: string; build: string } | undefined;

export function setMinLevel(level: LogLevel): void {
	minLevel = level;
}

export function registerSink(sink: LogSink): () => void {
	sinks.add(sink);
	return () => {
		sinks.delete(sink);
	};
}

export async function flushLogs(): Promise<void> {
	await Promise.all(
		[session, ...sinks].map(async (sink) => {
			try {
				await sink.flush?.();
			} catch {
				// A failing flush must not surface.
			}
		}),
	);
}

function stamp() {
	if (!versionStamp) {
		const info = getAppInfo();
		versionStamp = { appVersion: info.version, build: info.build };
	}
	return versionStamp;
}

function write(level: LogLevel, event: string, fields?: LogFields): void {
	try {
		if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
		const error = fields?.error;
		if (error instanceof Error) {
			if (reported.has(error)) return;
			reported.add(error);
		}
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			event,
			...stamp(),
		};
		const safe = redactFields(fields);
		if (safe) entry.fields = safe;
		const serialized = serializeError(error);
		if (serialized) entry.error = serialized;

		for (const sink of [session, ...sinks]) {
			try {
				sink.write(entry);
			} catch {
				// One broken sink must not stop the others or the app.
			}
		}
	} catch {}
}

export const log = {
	debug: (event: string, fields?: LogFields) => write("debug", event, fields),
	info: (event: string, fields?: LogFields) => write("info", event, fields),
	warn: (event: string, fields?: LogFields) => write("warn", event, fields),
	error: (event: string, fields?: LogFields) => write("error", event, fields),
};

export function getLogEntries(): readonly LogEntry[] {
	return session.entries();
}

export function wasLogged(error: unknown): boolean {
	return typeof error === "object" && error !== null && reported.has(error);
}

export function clearLog(): void {
	session.clear();
	reported = new WeakSet();
}
