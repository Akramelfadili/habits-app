import * as Notifications from "expo-notifications";
import { log } from "@/lib/logger/logger";

export type NotificationPermission = "granted" | "denied" | "undetermined";

export type ReminderNotification = {
	// Each OS notification id is `"<id>:<suffix>"`, so cancelling by the prefix `"<id>:"` removes exactly this reminder's.
	id: string;
	title: string;
	body: string;
	hour: number;
	minute: number;
	weekdays: readonly number[];
};

// Without a handler, iOS drops a notification that arrives while the app is in the foreground.
export function configureNotificationHandler(): void {
	Notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldPlaySound: true,
			shouldSetBadge: false,
			shouldShowBanner: true,
			shouldShowList: true,
		}),
	});
}

function toPermission(
	response: Notifications.NotificationPermissionsStatus,
): NotificationPermission {
	// iOS reports provisional/ephemeral authorization with `granted: false`, so trust its own status.
	const iosStatus = response.ios?.status;
	if (iosStatus !== undefined) {
		switch (iosStatus) {
			case Notifications.IosAuthorizationStatus.NOT_DETERMINED:
				return "undetermined";
			case Notifications.IosAuthorizationStatus.DENIED:
				return "denied";
			default:
				return "granted";
		}
	}
	if (response.granted) return "granted";
	return response.status === "undetermined" ? "undetermined" : "denied";
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
	return toPermission(await Notifications.getPermissionsAsync());
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
	return toPermission(await Notifications.requestPermissionsAsync());
}

function toCalendarWeekday(isoWeekday: number): number {
	return (isoWeekday % 7) + 1;
}

// `"<reminder id>:<daily|day-N>:<HHmm>:<generation>"`. The time lets a launch-time reconcile spot an
// edited reminder; the generation lets a new set sit beside the old one while being swapped in.
export function notificationIdentifier(
	reminder: Pick<ReminderNotification, "id" | "hour" | "minute">,
	slot: NotificationSlot,
	generation: string,
): string {
	const time = `${String(reminder.hour).padStart(2, "0")}${String(reminder.minute).padStart(2, "0")}`;
	return `${reminder.id}:${slot}:${time}:${generation}`;
}

let generationCounter = 0;

export function newGeneration(): string {
	generationCounter = (generationCounter + 1) % 1296;
	return `${Date.now().toString(36)}${generationCounter.toString(36)}`;
}

export type NotificationSlot = "daily" | `day-${number}`;

export function reminderSlots(weekdays: readonly number[]): NotificationSlot[] {
	const days = [...new Set(weekdays)];
	return days.length === 7
		? ["daily"]
		: days.map((day) => `day-${day}` as const);
}

export type ParsedIdentifier = {
	reminderId: string;
	slot: string;
	time: string;
	generation: string;
};

export function parseIdentifier(identifier: string): ParsedIdentifier | null {
	const match = identifier.match(/^(.+):(daily|day-\d):(\d{4}):([0-9a-z]+)$/);
	const [, reminderId, slot, time, generation] = match ?? [];
	if (!reminderId || !slot || !time || !generation) return null;
	return { reminderId, slot, time, generation };
}

// Every-day reminders use one daily trigger, not seven weekly ones: iOS keeps at most 64 pending
// notifications per app. Never cancels old ones (the caller does, after success, so a failure
// can't leave fewer reminders); a partial failure cancels this call's triggers and rethrows.
export async function scheduleReminder(
	reminder: ReminderNotification,
	generation: string,
): Promise<string[]> {
	const content = { title: reminder.title, body: reminder.body };
	const slots = reminderSlots(reminder.weekdays);
	const created: string[] = [];

	try {
		for (const slot of slots) {
			const identifier = notificationIdentifier(reminder, slot, generation);
			await Notifications.scheduleNotificationAsync({
				identifier,
				content,
				trigger:
					slot === "daily"
						? {
								type: Notifications.SchedulableTriggerInputTypes.DAILY,
								hour: reminder.hour,
								minute: reminder.minute,
							}
						: {
								type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
								weekday: toCalendarWeekday(Number(slot.slice(4))),
								hour: reminder.hour,
								minute: reminder.minute,
								repeats: true,
							},
			});
			created.push(identifier);
		}
		return created;
	} catch (error) {
		await cancelScheduled(created).catch((cleanupError) =>
			log.warn("notifications.cleanup_failed", { error: cleanupError }),
		);
		throw error;
	}
}

export async function listScheduledIdentifiers(): Promise<string[]> {
	const scheduled = await Notifications.getAllScheduledNotificationsAsync();
	return scheduled.map((request) => request.identifier);
}

/** Cancels exactly these identifiers — never "everything", which would take a just-scheduled set with it. */
export async function cancelScheduled(
	identifiers: readonly string[],
): Promise<void> {
	for (const identifier of identifiers) {
		await Notifications.cancelScheduledNotificationAsync(identifier);
	}
}

// End the prefix with a separator, or `"habit-1"` would also match habit 12's.
export async function cancelRemindersWithPrefix(prefix: string): Promise<void> {
	const identifiers = await listScheduledIdentifiers();
	await cancelScheduled(
		identifiers.filter((identifier) => identifier.startsWith(prefix)),
	);
}
