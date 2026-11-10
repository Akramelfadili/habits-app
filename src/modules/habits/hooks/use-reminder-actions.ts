import { ensureNotificationPermission } from "@/lib/notifications/use-notification-permission";
import { failureMessage, UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import {
	addReminder,
	editReminder,
	removeReminder,
	restoreReminder,
	setEveningReview,
} from "../services/reminder-service";
import type { Habit, ReminderDraft, ReminderPatch } from "../types";

// A denial never blocks the save: settings are kept and the screen shows a persistent notice instead.

async function addTime(habit: Habit, draft?: ReminderDraft) {
	await ensureNotificationPermission();
	return addReminder(habit, draft);
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
	const add = useAsyncAction(addTime, {
		scope: "reminders",
		failure: failureMessage("add", "this reminder"),
	});
	const edit = useAsyncAction(editTime, {
		scope: "reminders",
		failure: failureMessage("update", "this reminder"),
	});
	const remove = useAsyncAction(removeReminder, {
		scope: "reminders",
		failure: failureMessage("remove", "this reminder"),
	});

	const restore = useAsyncAction(restoreReminder, {
		scope: "reminders",
		failure: UNDO_FAILED_MESSAGE,
	});

	return {
		addReminder: add.run,
		isAdding: add.isLoading,
		addError: add.error,
		editReminder: edit.run,
		removeReminder: remove.run,
		restoreReminder: restore.run,
	};
}
