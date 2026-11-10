import { useSyncExternalStore } from "react";
import { THEME_PREFERENCE_SETTING_KEY } from "../keys";
import type * as NativeAppSettingsRepository from "./app-settings-repository";

/**
 * Web-only in-memory stand-in (no SQLite on web), like `habit-repository.web.ts`.
 * Seeded as "already seen" so the `today-empty` visual check shows the plain empty state.
 * `?fixtures=first-run` clears the seed; `?fixtures=reminders-at-cap` turns the Evening review on.
 * `?theme=light|dark` seeds the Appearance choice ("system" when absent).
 * `?fixtures=settings` / `settings-notifications-off` / `export-fails` seed the Settings screen states.
 */
const SEEN_FIRST_RUN_SEED_KEY = "habits.seenFirstRun";
const EVENING_REVIEW_SEED_KEY = "habits.eveningReview";

function initialSettings(): Map<string, string> {
	const search = globalThis.location?.search ?? "";
	const scenario = new URLSearchParams(search).get("fixtures");
	const settings = new Map<string, string>();
	if (scenario !== "first-run") {
		settings.set(SEEN_FIRST_RUN_SEED_KEY, "true");
	}
	if (scenario === "reminders-at-cap") {
		settings.set(EVENING_REVIEW_SEED_KEY, "true");
	}
	const theme = new URLSearchParams(search).get("theme");
	if (theme) settings.set(THEME_PREFERENCE_SETTING_KEY, theme);
	if (scenario === "settings" || scenario === "export-fails") {
		settings.set(EVENING_REVIEW_SEED_KEY, "true");
	}
	if (scenario === "settings-notifications-off") {
		settings.set(EVENING_REVIEW_SEED_KEY, "true");
		settings.set("habits.lastExport", "2026-08-02");
	}
	return settings;
}

let store: Map<string, string> | undefined;
const listeners = new Set<() => void>();

function getStore(): Map<string, string> {
	store ??= initialSettings();
	return store;
}

function notify() {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export async function getSetting(key: string): Promise<string | null> {
	return getStore().get(key) ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
	getStore().set(key, value);
	notify();
}

export function useAppSetting(key: string): string | null {
	return useSyncExternalStore(
		subscribe,
		() => getStore().get(key) ?? null,
		() => null,
	);
}

// Compile-time guard: this file must export exactly what the native repository
// does, so a function added there without a web counterpart fails `tsc`.
const _sameShape: typeof NativeAppSettingsRepository = {
	getSetting,
	setSetting,
	useAppSetting,
};
void _sameShape;
