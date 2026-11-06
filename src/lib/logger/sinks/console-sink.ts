import { formatEntry } from "../format";
import type { LogSink } from "../types";

/**
 * Development console mirror — the one place in `src/` allowed to call
 * `console.*` (check-architecture enforces it). `console.log` for every level:
 * console.error/warn would raise React Native's LogBox toast over the app for
 * an error that is already handled.
 */
export const consoleSink: LogSink = {
	write(entry) {
		console.log(formatEntry(entry));
	},
};

/** Whether the console mirror belongs in this build: development, not Jest. */
export function shouldMirrorToConsole(): boolean {
	return __DEV__ && process.env.NODE_ENV !== "test";
}
