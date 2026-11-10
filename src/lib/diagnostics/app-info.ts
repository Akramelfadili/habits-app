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

// Day-boundary bugs depend on language and time zone.
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

// `build` is the native binary's own number; the config value is only a fallback and can differ after an update.
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
