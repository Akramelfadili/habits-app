import type { LogEntry } from "./types";

export function formatEntry(entry: LogEntry): string {
	const parts = [
		`${entry.timestamp} ${entry.level.toUpperCase()} ${entry.event}`,
	];
	if (entry.fields) parts.push(JSON.stringify(entry.fields));
	if (entry.error) {
		const { name, code, message } = entry.error;
		parts.push(`${name}${code !== undefined ? ` (${code})` : ""}: ${message}`);
		if (entry.error.cause) {
			parts.push(
				`caused by ${entry.error.cause.name}: ${entry.error.cause.message}`,
			);
		}
		if (entry.error.stack) parts.push(entry.error.stack);
	}
	return parts.join("\n  ");
}
