import { Appearance, type ColorSchemeName } from "react-native";
import { create } from "zustand";
import { log } from "@/lib/logger/logger";
import type { ColorScheme } from "./theme";

/** The Appearance choice (HAB-15). "system" follows iOS. */
export type ThemePreference = "light" | "dark" | "system";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export function isThemePreference(
	value: string | null,
): value is ThemePreference {
	return value === "light" || value === "dark" || value === "system";
}

/**
 * The scheme to draw with. An explicit Light/Dark always wins over the OS
 * scheme; "system" follows it (and falls back to light when the OS reports
 * nothing).
 */
export function resolveScheme(
	preference: ThemePreference,
	systemScheme: ColorSchemeName | undefined,
): ColorScheme {
	if (preference === "light" || preference === "dark") return preference;
	return systemScheme === "dark" ? "dark" : "light";
}

/**
 * Pushes the choice to the native side so everything the app doesn't draw
 * itself — keyboard, status bar, alerts, share sheet — follows it. "auto"
 * removes the override and hands control back to iOS.
 */
export function applyNativeScheme(preference: ThemePreference) {
	try {
		Appearance.setColorScheme(
			preference === "system" ? "unspecified" : preference,
		);
	} catch {
		// Not every runtime (web fixtures, tests) supports the override — drawing
		// still follows the store, only the native chrome is left alone.
		log.debug("theme", "native colour scheme override unavailable");
	}
}

type ThemePreferenceState = {
	preference: ThemePreference;
	/** False until the stored choice has been read — the root layout holds the splash until then. */
	isLoaded: boolean;
};

export const useThemePreferenceStore = create<ThemePreferenceState>(() => ({
	preference: DEFAULT_THEME_PREFERENCE,
	isLoaded: false,
}));
