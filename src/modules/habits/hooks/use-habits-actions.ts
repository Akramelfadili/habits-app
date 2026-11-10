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

// The restore toast's Undo re-archives with the archive date and pauses it had before, not a fresh archive dated today.
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
		async archive(habit: Habit) {
			const result = await archive.run(habit.id);
			if (!result.ok) return;
			showMessage(messages.habitArchived, [habit.name], () =>
				restore.run(habit.id),
			);
		},
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
