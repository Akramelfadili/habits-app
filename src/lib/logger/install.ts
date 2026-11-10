import { AppState } from "react-native";
import { flushLogs, getLogEntries, registerSink } from "./logger";
import { consoleSink, shouldMirrorToConsole } from "./sinks/console-sink";
import { createRingBufferSink } from "./sinks/ring-buffer-sink";
import type { LogEntry } from "./types";

let installed = false;
const ringBuffer = createRingBufferSink();

/**
 * The one place sinks are registered. A new sink (a remote crash reporter, say)
 * is a new file under `sinks/` plus one `registerSink` line here — no call site
 * changes. Call once at module load of the root layout, before anything logs.
 */
export function installLogging(): void {
	if (installed) return;
	installed = true;
	if (shouldMirrorToConsole()) registerSink(consoleSink);
	registerSink(ringBuffer);
	// The app can be killed in the background: write the queue when it leaves.
	AppState.addEventListener("change", (state) => {
		if (state !== "active") void flushLogs();
	});
}

export async function readRecentLogEntries(): Promise<readonly LogEntry[]> {
	const stored = await ringBuffer.recent();
	return stored.length > 0 ? stored : getLogEntries();
}
