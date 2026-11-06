import type { LogEntry } from "../types";
import type * as NativeLogRepository from "./log-repository";

/**
 * Web-only stand-in for `log-repository.ts`: an in-memory ring (the web build
 * has no SQLite file; it does not survive a reload).
 */
let rows: LogEntry[] = [];

export const appendLogEntries: typeof NativeLogRepository.appendLogEntries =
	async (entries, keep) => {
		rows = [...rows, ...entries].slice(-keep);
	};

export const readLogEntries: typeof NativeLogRepository.readLogEntries =
	async () => [...rows];

export const clearLogEntries: typeof NativeLogRepository.clearLogEntries =
	async () => {
		rows = [];
	};
