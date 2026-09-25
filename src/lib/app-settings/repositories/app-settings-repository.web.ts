import { useSyncExternalStore } from "react";
import type * as NativeAppSettingsRepository from "./app-settings-repository";

/**
 * Web-only stand-in for `app-settings-repository.ts`, mirroring the pattern
 * `habit-repository.web.ts` uses — no real Drizzle/SQLite on web, so this is
 * an in-memory store instead. Seeded as "already seen" by default so the
 * existing `today-empty` visual check still renders HAB-05's plain empty
 * state; `?fixtures=first-run` clears the seed so HAB-06 shows instead.
 */
const SEEN_FIRST_RUN_SEED_KEY = "habits.seenFirstRun";

function initialSettings(): Map<string, string> {
	const search = globalThis.location?.search ?? "";
	const scenario = new URLSearchParams(search).get("fixtures");
	const settings = new Map<string, string>();
	if (scenario !== "first-run") {
		settings.set(SEEN_FIRST_RUN_SEED_KEY, "true");
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

export async function deleteSetting(key: string): Promise<void> {
	if (!__DEV__) {
		throw new Error("deleteSetting is dev-only");
	}
	getStore().delete(key);
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
	deleteSetting,
	useAppSetting,
};
void _sameShape;
