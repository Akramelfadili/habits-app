import type * as NativeNotifications from "./notifications";
import type { NotificationPermission } from "./notifications";

/**
 * Web-only stand-in for `notifications.ts` — expo-notifications has no web
 * support, and web only exists for visual checks against docs/mockups/
 * (scripts/visual-check.mjs). Scheduling is a no-op. Permission reads as
 * denied under `?fixtures=reminders` so the permission notice in
 * docs/mockups/reminders.png renders; granted everywhere else. Reads the
 * param itself, like `app-settings-repository.web.ts` — `lib/` can't import
 * a module's fixture helpers.
 */
function fixturePermission(): NotificationPermission {
	const search = globalThis.location?.search ?? "";
	const scenario = new URLSearchParams(search).get("fixtures");
	return scenario === "reminders" || scenario === "settings-notifications-off"
		? "denied"
		: "granted";
}

export function configureNotificationHandler(): void {}

export async function getNotificationPermission(): Promise<NotificationPermission> {
	return fixturePermission();
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
	return fixturePermission();
}

export async function scheduleReminder(): Promise<void> {}

export async function cancelRemindersWithPrefix(): Promise<void> {}

// Compile-time guard: this file must export exactly what the native adapter
// does, so a function added there without a web counterpart fails `tsc`.
const _sameShape: typeof NativeNotifications = {
	configureNotificationHandler,
	getNotificationPermission,
	requestNotificationPermission,
	scheduleReminder,
	cancelRemindersWithPrefix,
};
void _sameShape;
