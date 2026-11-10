import type { LogEntry } from "../types";

export function sampleEntry(event = "t.m"): LogEntry {
	return {
		timestamp: "2026-11-06T10:00:00.000Z",
		level: "info",
		event,
		fields: { habitId: 1 },
		appVersion: "1.0.0",
		build: "1",
	};
}
