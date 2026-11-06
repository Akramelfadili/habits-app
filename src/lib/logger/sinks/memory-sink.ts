import type { LogEntry, LogSink } from "../types";

export type MemorySink = LogSink & {
	entries(): readonly LogEntry[];
	clear(): void;
};

/**
 * The current session's last `max` entries, in memory. The core keeps one so
 * tests and "Copy diagnostics" have something to read even when the persistent
 * store is unavailable.
 */
export function createMemorySink(max: number): MemorySink {
	let entries: LogEntry[] = [];
	return {
		write(entry) {
			entries.push(entry);
			if (entries.length > max) entries = entries.slice(-max);
		},
		entries: () => entries,
		clear() {
			entries = [];
		},
	};
}
