import { THEME_PREFERENCE_SETTING_KEY } from "@/lib/app-settings/keys";
import {
	getSetting,
	setSetting,
} from "@/lib/app-settings/repositories/app-settings-repository";
import { log } from "@/lib/logger/logger";
import {
	applyNativeScheme,
	DEFAULT_THEME_PREFERENCE,
	isThemePreference,
	type ThemePreference,
	useThemePreferenceStore,
} from "./theme-preference-store";

/** Reads the stored choice once at startup and applies it before the first frame is drawn. */
export async function loadThemePreference(): Promise<void> {
	let preference = DEFAULT_THEME_PREFERENCE;
	try {
		const stored = await getSetting(THEME_PREFERENCE_SETTING_KEY);
		if (isThemePreference(stored)) preference = stored;
	} catch (error) {
		// An unreadable setting must never keep the app from opening.
		log.warn("theme", "could not read the saved Appearance choice", error);
	}
	applyNativeScheme(preference);
	useThemePreferenceStore.setState({ preference, isLoaded: true });
}

/** Applies immediately, then persists — the UI never waits on the database. */
export async function setThemePreference(
	preference: ThemePreference,
): Promise<void> {
	applyNativeScheme(preference);
	useThemePreferenceStore.setState({ preference });
	await setSetting(THEME_PREFERENCE_SETTING_KEY, preference);
}
