import Constants from "expo-constants";
import * as Device from "expo-device";
import { SCHEMA_VERSION } from "@/lib/db/schema-version";

export type AppInfo = {
	version: string;
	build: string;
	schemaVersion: number;
	platform: string;
	osVersion: string;
	device: string;
};

/** Language and time zone, for "Copy diagnostics" (day-boundary bugs depend on them). */
export function getLocaleInfo(): { locale: string; timeZone: string } {
	try {
		const options = Intl.DateTimeFormat().resolvedOptions();
		return {
			locale: options.locale || "unknown",
			timeZone: options.timeZone || "unknown",
		};
	} catch {
		return { locale: "unknown", timeZone: "unknown" };
	}
}

/**
 * Version facts for the About row, the export file and "Copy diagnostics".
 * `build` is the native binary's own number (`CFBundleVersion`); the config
 * value is only a fallback — it can differ once an update has been applied.
 */
export function getAppInfo(): AppInfo {
	return {
		version: Constants.expoConfig?.version ?? "unknown",
		build:
			Constants.platform?.ios?.buildNumber ??
			Constants.expoConfig?.ios?.buildNumber ??
			"unknown",
		schemaVersion: SCHEMA_VERSION,
		platform: Device.osName ?? "unknown",
		osVersion: Device.osVersion ?? "unknown",
		device: Device.modelName ?? "unknown",
	};
}
