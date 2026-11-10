import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { log } from "@/lib/logger/logger";
import {
	getNotificationPermission,
	type NotificationPermission,
	requestNotificationPermission,
} from "./notifications";

// Shared, so the "notifications are off" notice updates when an action asks for permission and
// again when the user returns from Settings, which changes it outside the app.
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

// Effects can't await: a failed permission read is logged, not an unhandled rejection.
function refreshInBackground(): void {
	refresh().catch((error) =>
		log.warn("notifications.permission_read_failed", { error }),
	);
}

// Never re-prompts after a denial: iOS wouldn't show it again; the notice points to Settings instead.
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
	let permission = await getNotificationPermission();
	if (permission === "undetermined") {
		permission = await requestNotificationPermission();
	}
	set(permission);
	return permission;
}

export function useNotificationPermission():
	| NotificationPermission
	| undefined {
	const permission = useSyncExternalStore(
		subscribe,
		() => current,
		() => undefined,
	);

	useEffect(() => {
		refreshInBackground();
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") refreshInBackground();
		});
		return () => subscription.remove();
	}, []);

	return permission;
}
