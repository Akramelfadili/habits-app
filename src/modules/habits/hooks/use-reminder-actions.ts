import { ensureNotificationPermission } from "@/lib/notifications/use-notification-permission";
import { useAsyncAction } from "@/utils/use-async-action";
import {
	addReminder,
	editReminder,
	removeReminder,
	setEveningReview,
} from "../services/reminder-service";
import type { Habit, ReminderPatch } from "../types";

/*
 * Anything that turns a notification *on* first makes sure the OS has been
 * asked — once, the first time it matters. A denial never blocks the save:
 * settings are kept, and the screen shows a persistent notice instead.
 */

async function addTime(habit: Habit) {
	await ensureNotificationPermission();
	return addReminder(habit);
}

async function editTime(
	habit: Habit,
	reminderId: number,
	patch: ReminderPatch,
) {
	if (patch.enabled) await ensureNotificationPermission();
	return editReminder(habit, reminderId, patch);
}

export async function toggleEveningReview(enabled: boolean) {
	if (enabled) await ensureNotificationPermission();
	return setEveningReview(enabled);
}

export function useReminderActions() {
	const add = useAsyncAction(addTime);
	const edit = useAsyncAction(editTime);
	const remove = useAsyncAction(removeReminder);
	const eveningReview = useAsyncAction(toggleEveningReview);

	return {
		addReminder: add.execute,
		isAdding: add.isLoading,
		addError: add.error,
		editReminder: edit.execute,
		removeReminder: remove.execute,
		setEveningReview: eveningReview.execute,
	};
}
