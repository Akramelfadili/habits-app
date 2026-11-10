import { formatEntry } from "../format";
import type { LogSink } from "../types";

// `console.log` for every level: console.error/warn would raise React Native's LogBox toast for an already-handled error.
export const consoleSink: LogSink = {
	write(entry) {
		console.log(formatEntry(entry));
	},
};

export function shouldMirrorToConsole(): boolean {
	return __DEV__ && process.env.NODE_ENV !== "test";
}
