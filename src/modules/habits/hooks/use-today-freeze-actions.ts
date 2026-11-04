import { format, isSameDay } from "date-fns";
import { useState } from "react";
import { messages, showMessage } from "../messages";
import type { Habit } from "../types";
import { useStreakActions } from "./use-streak-actions";
import type { TodayAtRisk } from "./use-today-queries";

type TodayFreezeInput = {
	/** The habits on screen — the at-risk one is found among them. */
	habits: readonly Habit[];
	atRiskByHabitId: ReadonlyMap<number, TodayAtRisk>;
	/** The real today, read when the sheet opens (and pinned from then on). */
	today: Date;
};

/** What the open sheet shows: what was true when it was opened, not what the clock says now. */
type AtRiskSession = {
	habitId: number;
	habit: Habit;
	info: TodayAtRisk;
	today: Date;
};

/**
 * Today's streak-at-risk flow (HAB-08, HAB-33): which habit's sheet is open,
 * using a freeze for the missed day (with an Undo for that same day) and
 * dismissing the sheet ("Not now", or SR3's "Got it") without writing anything.
 *
 * An open sheet keeps the day it was opened on, like the quantity sheet (SY5):
 * crossing midnight neither changes what the person is reading nor closes it.
 * It can no longer spend a freeze the grace window has closed on, though: the
 * live read is checked on "Use a freeze", and a stale one says so in a toast
 * and writes nothing.
 */
export function useTodayFreezeActions({
	habits,
	atRiskByHabitId,
	today,
}: TodayFreezeInput) {
	const { applyFreeze, undoFreeze, isFreezing } = useStreakActions();
	const [session, setSession] = useState<AtRiskSession | null>(null);

	const atRiskHabit = session?.habit;
	const atRiskInfo = session?.info;

	async function spendFreeze() {
		if (!session) return;
		const habit = atRiskHabit;
		const { missedDate } = session.info;
		// The window may have closed under an open sheet (midnight): the live
		// read must still name the same missed day.
		const live = atRiskByHabitId.get(session.habitId);
		if (!live || !isSameDay(live.missedDate, missedDate)) {
			setSession(null);
			showMessage(messages.freezeTooLate, [format(missedDate, "EEE d")]);
			return;
		}
		const result = await applyFreeze(session.habitId, missedDate);
		if (!result.ok) return;
		setSession(null);
		// Undo takes the freeze back — for the missed day it was applied to.
		if (habit) {
			showMessage(
				messages.freezeUsed,
				[format(missedDate, "EEE d"), result.value.freezesLeft],
				() => undoFreeze(habit.id, missedDate),
			);
		}
	}

	return {
		atRiskHabit,
		atRiskInfo,
		/** The day the open sheet was opened on, for its "Resets on" line. */
		atRiskToday: session?.today,
		isFreezing,
		openAtRisk: (habitId: number) => {
			const info = atRiskByHabitId.get(habitId);
			const habit = habits.find((candidate) => candidate.id === habitId);
			if (info && habit) setSession({ habitId, habit, info, today });
		},
		spendFreeze,
		/** Closes the sheet and writes nothing. */
		dismissAtRisk: () => setSession(null),
	};
}
