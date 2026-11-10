import type * as NativeNotifications from "./notifications";
import type { NotificationPermission } from "./notifications";

/**
 * Web-only stand-in for `notifications.ts`: expo-notifications has no web support, and web only
 * exists for visual checks (scripts/visual-check.mjs). Scheduling is a no-op. Permission reads as
 * denied under `?fixtures=reminders` so the permission notice renders; granted everywhere else.
 * Reads the param itself, like `app-settings-repository.web.ts`: `lib/` can't import a module's
 * fixture helpers.
 */
function fixturePermission(): NotificationPermission {
	const search = globalThis.location?.search ?? "";
	const scenario = new URLSearchParams(search).get("fixtures");
	return scenario === "reminders" ||
		scenario === "reminders-times-denied" ||
		scenario === "settings-notifications-off"
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

export function notificationIdentifier(
	reminder: Pick<NativeNotifications.ReminderNotification, "id">,
	slot: string,
	generation: string,
): string {
	return `${reminder.id}:${slot}:${generation}`;
}

export function newGeneration(): string {
	return "web";
}

export function reminderSlots(): NativeNotifications.NotificationSlot[] {
	return [];
}

export function parseIdentifier(): NativeNotifications.ParsedIdentifier | null {
	return null;
}

export async function scheduleReminder(): Promise<string[]> {
	return [];
}

export async function listScheduledIdentifiers(): Promise<string[]> {
	return [];
}

export async function cancelScheduled(): Promise<void> {}

export async function cancelRemindersWithPrefix(): Promise<void> {}

// Compile-time guard: this file must export exactly what the native adapter
// does, so a function added there without a web counterpart fails `tsc`.
const _sameShape: typeof NativeNotifications = {
	configureNotificationHandler,
	getNotificationPermission,
	requestNotificationPermission,
	scheduleReminder,
	listScheduledIdentifiers,
	cancelScheduled,
	cancelRemindersWithPrefix,
	notificationIdentifier,
	newGeneration,
	reminderSlots,
	parseIdentifier,
};
void _sameShape;
