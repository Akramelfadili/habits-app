import type { NotificationPermission } from "@/lib/notifications/notifications";
import { ensureNotificationPermission } from "@/lib/notifications/use-notification-permission";
import type { Habit } from "../types";
import { addReminder } from "./reminder-service";

/**
 * "Allow reminders" on First Run's own pre-prompt (FR3, HAB-46): the habit
 * gets asked by iOS — only now, after our own explanation — and then its
 * default daily reminder (09:00, on the days it can be due) is added. A denial never undoes the
 * reminder: it stays editable and the Reminders screens show the "off" notice.
 * Resolves with what the person answered, so the caller can say so.
 */
export async function enableFirstHabitReminder(
	habit: Habit,
): Promise<NotificationPermission> {
	const permission = await ensureNotificationPermission();
	await addReminder(habit);
	return permission;
}
