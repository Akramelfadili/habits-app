import { copyText } from "@/lib/clipboard/clipboard";
import { formatEntry } from "@/lib/logger/format";
import { readRecentLogEntries } from "@/lib/logger/install";
import { log } from "@/lib/logger/logger";
import { getAppInfo, getLocaleInfo } from "./app-info";

/**
 * Plain text a person can paste into a message: version and device facts, then
 * the recent log, newest last. Everything in it is already redacted by the
 * logger core; the header holds no personal data (no habit text, no ids).
 */
export async function buildDiagnosticsReport(): Promise<string> {
	const info = getAppInfo();
	const { locale, timeZone } = getLocaleInfo();
	const header = [
		"Habits diagnostics",
		`App version: ${info.version} (build ${info.build})`,
		`OS: ${info.platform} ${info.osVersion}`,
		`Device: ${info.device}`,
		`Database schema: ${info.schemaVersion}`,
		`Locale: ${locale}`,
		`Time zone: ${timeZone}`,
	];
	const entries = await readRecentLogEntries();
	const body =
		entries.length > 0
			? entries.map(formatEntry)
			: ["(no log entries recorded)"];
	return [
		...header,
		"",
		`Recent log (${entries.length} entries, newest last):`,
		...body,
	].join("\n");
}

export type DiagnosticsResult = "copied" | "shared" | "failed";

/** Never rejects: the screens that call it are the ones already showing a failure. */
export async function copyDiagnostics(): Promise<DiagnosticsResult> {
	try {
		return await copyText(await buildDiagnosticsReport(), "diagnostics.txt");
	} catch (error) {
		log.error("diagnostics.copy_failed", { error });
		return "failed";
	}
}
