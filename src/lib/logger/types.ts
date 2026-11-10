export type LogLevel = "debug" | "info" | "warn" | "error";

/** What a caller may pass. Only allowlisted names survive redaction (see redact.ts). */
export type LogFields = { error?: unknown } & Record<string, unknown>;

export type SerializedError = {
	name: string;
	code?: string | number;
	message: string;
	stack?: string;
	cause?: SerializedError;
};

export type SafeFieldValue = number | boolean | string | null;

/** What a sink receives: already redacted, so a sink never has to be careful. */
export type LogEntry = {
	timestamp: string;
	level: LogLevel;
	event: string;
	fields?: Record<string, SafeFieldValue>;
	error?: SerializedError;
	appVersion: string;
	build: string;
};

/**
 * Where entries go. `write` must be cheap and must not depend on the caller
 * waiting; do slow work (disk, network) in batches and expose it through
 * `flush`. The core catches anything a sink throws.
 */
export interface LogSink {
	write(entry: LogEntry): void;
	flush?(): void | Promise<void>;
}
