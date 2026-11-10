import { Appearance, type ColorSchemeName } from "react-native";
import { create } from "zustand";
import { log } from "@/lib/logger/logger";
import type { ColorScheme } from "./theme";

export type ThemePreference = "light" | "dark" | "system";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export function isThemePreference(
	value: string | null,
): value is ThemePreference {
	return value === "light" || value === "dark" || value === "system";
}

export function resolveScheme(
	preference: ThemePreference,
	systemScheme: ColorSchemeName | null | undefined,
): ColorScheme {
	if (preference === "light" || preference === "dark") return preference;
	return systemScheme === "dark" ? "dark" : "light";
}

// Pushed to the native side so what the app doesn't draw itself (keyboard, status bar, alerts, share sheet) follows it.
export function applyNativeScheme(preference: ThemePreference) {
	try {
		Appearance.setColorScheme(
			preference === "system" ? "unspecified" : preference,
		);
	} catch {
		// Not every runtime (web fixtures, tests) supports the override; drawing still follows the store.
		log.debug("theme.native_override_unavailable");
	}
}

type ThemePreferenceState = {
	preference: ThemePreference;
	isLoaded: boolean;
};

export const useThemePreferenceStore = create<ThemePreferenceState>(() => ({
	preference: DEFAULT_THEME_PREFERENCE,
	isLoaded: false,
}));
