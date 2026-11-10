import type { NotificationPermission } from "@/lib/notifications/notifications";
import { ensureNotificationPermission } from "@/lib/notifications/use-notification-permission";
import type { Habit } from "../types";
import { addReminder } from "./reminder-service";

// A denial never undoes the reminder: it stays editable and the Reminders screens show the "off" notice.
export async function enableFirstHabitReminder(
	habit: Habit,
): Promise<NotificationPermission> {
	const permission = await ensureNotificationPermission();
	await addReminder(habit);
	return permission;
}
