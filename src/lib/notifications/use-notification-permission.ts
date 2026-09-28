import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import {
	getNotificationPermission,
	type NotificationPermission,
	requestNotificationPermission,
} from "./notifications";

/**
 * One shared, observable copy of the OS notification permission, so the
 * screen showing the "notifications are off" notice updates the moment an
 * action asks for permission — and again when the user comes back from
 * Settings, since that change happens outside the app.
 */
let current: NotificationPermission | undefined;
const listeners = new Set<() => void>();

function set(next: NotificationPermission) {
	if (next === current) return;
	current = next;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

async function refresh(): Promise<void> {
	set(await getNotificationPermission());
}

/**
 * Asks for permission only if it has never been answered, then reports the
 * result. Never re-prompts after a denial — iOS wouldn't show the prompt
 * again anyway; the persistent notice points to Settings instead.
 */
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
	let permission = await getNotificationPermission();
	if (permission === "undetermined") {
		permission = await requestNotificationPermission();
	}
	set(permission);
	return permission;
}

/** The current permission — `undefined` until the first check resolves. */
export function useNotificationPermission():
	| NotificationPermission
	| undefined {
	const permission = useSyncExternalStore(
		subscribe,
		() => current,
		() => undefined,
	);

	useEffect(() => {
		void refresh();
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") void refresh();
		});
		return () => subscription.remove();
	}, []);

	return permission;
}
