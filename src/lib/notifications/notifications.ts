import * as Notifications from "expo-notifications";

/**
 * Adapter over `expo-notifications` (docs/app-architecture.md's Adapter
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
 * Schedules a repeating reminder. Every-day reminders use one daily trigger
 * rather than seven weekly ones — iOS keeps at most 64 pending
 * notifications per app, so this matters once several habits have
 * reminders. Replaces anything already scheduled under `id`.
 */
export async function scheduleReminder(
	reminder: ReminderNotification,
): Promise<void> {
	// With the ":" — "habit-3-reminder-7" alone would also match reminder 70.
	await cancelRemindersWithPrefix(`${reminder.id}:`);

	const content = { title: reminder.title, body: reminder.body };
	const days = [...new Set(reminder.weekdays)];

	if (days.length === 7) {
		await Notifications.scheduleNotificationAsync({
			identifier: `${reminder.id}:daily`,
			content,
			trigger: {
				type: Notifications.SchedulableTriggerInputTypes.DAILY,
				hour: reminder.hour,
				minute: reminder.minute,
			},
		});
		return;
	}

	for (const day of days) {
		await Notifications.scheduleNotificationAsync({
			identifier: `${reminder.id}:day-${day}`,
			content,
			trigger: {
				type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
				weekday: toCalendarWeekday(day),
				hour: reminder.hour,
				minute: reminder.minute,
				repeats: true,
			},
		});
	}
}

/**
 * Cancels every scheduled notification whose identifier starts with
 * `prefix` — one reminder's (`"habit-3-reminder-7:"`), or a whole habit's
 * (`"habit-3-"`). End the prefix with a separator, or `"habit-1"` would also
 * match habit 12's.
 */
export async function cancelRemindersWithPrefix(prefix: string): Promise<void> {
	const scheduled = await Notifications.getAllScheduledNotificationsAsync();
	for (const request of scheduled) {
		if (request.identifier.startsWith(prefix)) {
			await Notifications.cancelScheduledNotificationAsync(request.identifier);
		}
	}
}
