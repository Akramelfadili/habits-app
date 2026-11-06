import { registerSink } from "./logger";
import { consoleSink, shouldMirrorToConsole } from "./sinks/console-sink";

let installed = false;

/**
 * The one place sinks are registered. A new sink (a remote crash reporter, say)
 * is a new file under `sinks/` plus one `registerSink` line here — no call site
 * changes. Call once at module load of the root layout, before anything logs.
 */
export function installLogging(): void {
	if (installed) return;
	installed = true;
	if (shouldMirrorToConsole()) registerSink(consoleSink);
}
