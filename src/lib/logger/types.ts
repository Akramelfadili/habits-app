export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = { error?: unknown } & Record<string, unknown>;

export type SerializedError = {
	name: string;
	code?: string | number;
	message: string;
	stack?: string;
	cause?: SerializedError;
};

export type SafeFieldValue = number | boolean | string | null;

export type LogEntry = {
	timestamp: string;
	level: LogLevel;
	event: string;
	fields?: Record<string, SafeFieldValue>;
	error?: SerializedError;
	appVersion: string;
	build: string;
};

// `write` must be cheap and not depend on the caller waiting: do slow work in batches behind `flush`.
export interface LogSink {
	write(entry: LogEntry): void;
	flush?(): void | Promise<void>;
}
