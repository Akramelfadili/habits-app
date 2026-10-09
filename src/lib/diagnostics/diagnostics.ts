import { copyText } from "@/lib/clipboard/clipboard";
import { formatEntry, getLogEntries, log } from "@/lib/logger/logger";
import { getAppInfo } from "./app-info";

/** Plain text a person can paste into a message: version facts, then the in-memory log. */
export function buildDiagnosticsReport(): string {
	const info = getAppInfo();
	const header = [
		"Habits diagnostics",
		`App version: ${info.version} (build ${info.build})`,
		`Database schema: ${info.schemaVersion}`,
		`Device: ${info.device}, ${info.platform} ${info.osVersion}`,
	];
	const entries = getLogEntries();
	const body =
		entries.length > 0
			? entries.map(formatEntry)
			: ["(no log entries this session)"];
	return [
		...header,
		"",
		`Recent log (${entries.length} entries):`,
		...body,
	].join("\n");
}

/** Result of "Copy diagnostics" — `shared` is the fallback when the clipboard module isn't in the build. */
export type DiagnosticsResult = "copied" | "shared" | "failed";

/** Never rejects: the screens that call it are the ones already showing a failure. */
export async function copyDiagnostics(): Promise<DiagnosticsResult> {
	try {
		return await copyText(buildDiagnosticsReport(), "diagnostics.txt");
	} catch (error) {
		log.error("diagnostics", "copy failed", error);
		return "failed";
	}
}
