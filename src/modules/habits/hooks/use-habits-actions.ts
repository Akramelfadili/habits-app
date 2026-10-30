import { failureMessage, UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { messages, showMessage } from "../messages";
import { reorderHabits } from "../repositories/habit-repository";
import {
	archiveHabit,
	restoreHabit,
	undoRestoreHabit,
} from "../services/habit-lifecycle-service";
import type { Habit } from "../types";

/**
 * The Habits tab's writes (HAB-39). Reorder is a single repository write;
 * archive and restore also move the habit's notifications, so they go through
 * the lifecycle service — and say so in one toast with an Undo (D12): the
 * restore toast re-archives with the archive date and pauses it had before, not
 * a fresh archive dated today (HAB-20).
 */
export function useHabitsActions() {
	const reorder = useAsyncAction(reorderHabits, {
		scope: "habits",
		failure: failureMessage("reorder", "your habits"),
	});
	const archive = useAsyncAction(archiveHabit, {
		scope: "habits",
		failure: failureMessage("archive", "this habit"),
	});
	const restore = useAsyncAction(restoreHabit, {
		scope: "habits",
		failure: failureMessage("restore", "this habit"),
	});
	const undoRestore = useAsyncAction(undoRestoreHabit, {
		scope: "habits",
		failure: UNDO_FAILED_MESSAGE,
	});

	return {
		reorderHabits: reorder.run,
		/** The row's VoiceOver Archive action: instant, with an Undo toast. */
		async archive(habit: Habit) {
			const result = await archive.run(habit.id);
			if (!result.ok) return;
			showMessage(messages.habitArchived, [habit.name], () =>
				restore.run(habit.id),
			);
		},
		/** Instant, no confirmation: Undo covers a mistake (H5). */
		async restore(habit: Habit) {
			const { archivedAt, pauses } = habit;
			const result = await restore.run(habit.id);
			if (!result.ok) return;
			showMessage(messages.habitRestored, [habit.name], () =>
				undoRestore.run(habit.id, { archivedAt, pauses }),
			);
		},
		isRestoring: restore.isLoading,
	};
}
