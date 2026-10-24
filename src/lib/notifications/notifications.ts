import * as Notifications from "expo-notifications";
import { log } from "@/lib/logger/logger";

/**
 * Adapter over `expo-notifications` (docs/architecture.md's Adapter
 * pattern): the only file that imports it. Everything else speaks this
 * small interface, so swapping the library — or adding a second delivery
 * path — touches this file alone. Local, on-device notifications only.
 */

export type NotificationPermission = "granted" | "denied" | "undetermined";

export type ReminderNotification = {
	/**
	 * Stable id for this reminder. Each scheduled OS notification's identifier
	 * is `"<id>:<suffix>"`, so cancelling with the prefix `"<id>:"` removes
	 * exactly this reminder's, and a shorter prefix shared by several ids
	 * (`"habit-3-"`) removes them all.
	 */
	id: string;
	title: string;
	body: string;
	/** 0–23, local time. */
	hour: number;
	/** 0–59. */
	minute: number;
	/** ISO weekdays (1 = Monday … 7 = Sunday) to repeat on, every week. */
	weekdays: readonly number[];
};

/**
 * Shows notifications as banners even while the app is open — without a
 * handler, iOS drops a notification that arrives in the foreground. Call
 * once at startup.
 */
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
	// iOS reports provisional/ephemeral authorization with `granted: false`,
	// so its own status is the one to trust (per the expo-notifications docs).
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

/** Shows the OS prompt if it hasn't been answered yet; otherwise just reports the answer. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
	return toPermission(await Notifications.requestPermissionsAsync());
}

/** ISO weekday (1 = Monday) → iOS calendar weekday (1 = Sunday). */
function toCalendarWeekday(isoWeekday: number): number {
	return (isoWeekday % 7) + 1;
}

/**
 * Identifier of one scheduled OS notification:
 * `"<reminder id>:<daily|day-N>:<HHmm>:<generation>"`. The time is part of it
 * so a launch-time reconcile can tell a reminder whose time was edited from
 * an up-to-date one; the generation makes every scheduling run's identifiers
 * unique, so a new set can sit beside the old one while it is being swapped
 * in (see `syncHabitReminders`) — neither can overwrite or cancel the other.
 */
export function notificationIdentifier(
	reminder: Pick<ReminderNotification, "id" | "hour" | "minute">,
	slot: NotificationSlot,
	generation: string,
): string {
	const time = `${String(reminder.hour).padStart(2, "0")}${String(reminder.minute).padStart(2, "0")}`;
	return `${reminder.id}:${slot}:${time}:${generation}`;
}

let generationCounter = 0;

/** A short token that names one scheduling run — unique even for two runs in the same millisecond. */
export function newGeneration(): string {
	generationCounter = (generationCounter + 1) % 1296;
	return `${Date.now().toString(36)}${generationCounter.toString(36)}`;
}

export type NotificationSlot = "daily" | `day-${number}`;

/** The triggers a reminder's days need: one daily trigger for all seven, else one weekly per day. */
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

/** Reads an identifier made by `notificationIdentifier`; null for anything else (an older format, or not ours). */
export function parseIdentifier(identifier: string): ParsedIdentifier | null {
	const match = identifier.match(/^(.+):(daily|day-\d):(\d{4}):([0-9a-z]+)$/);
	if (!match) return null;
	return {
		reminderId: match[1],
		slot: match[2],
		time: match[3],
		generation: match[4],
	};
}

/**
 * Schedules a repeating reminder and returns the identifiers it created.
 * Every-day reminders use one daily trigger rather than seven weekly ones —
 * iOS keeps at most 64 pending notifications per app, so this matters once
 * several habits have reminders.
 *
 * It does *not* cancel anything: replacing the old notifications is the
 * caller's job, after this succeeds, so a failure here never leaves the habit
 * with fewer reminders than it had. If one of several triggers fails, the
 * ones already created by this call are cancelled and the error rethrown —
 * a reminder is scheduled completely or not at all.
 */
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
			log.warn(
				"notifications",
				"cleanup after a failed schedule failed",
				cleanupError,
			),
		);
		throw error;
	}
}

/** Every pending notification's identifier — a snapshot to diff against before scheduling. */
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

/**
 * Cancels every scheduled notification whose identifier starts with
 * `prefix` — one reminder's (`"habit-3-reminder-7:"`), or a whole habit's
 * (`"habit-3-"`). End the prefix with a separator, or `"habit-1"` would also
 * match habit 12's.
 */
export async function cancelRemindersWithPrefix(prefix: string): Promise<void> {
	const identifiers = await listScheduledIdentifiers();
	await cancelScheduled(
		identifiers.filter((identifier) => identifier.startsWith(prefix)),
	);
}
