import { format, isSameDay } from "date-fns";
import { useState } from "react";
import { messages, showMessage } from "../messages";
import type { Habit } from "../types";
import { useStreakActions } from "./use-streak-actions";
import type { TodayAtRisk } from "./use-today-queries";

type TodayFreezeInput = {
	habits: readonly Habit[];
	atRiskByHabitId: ReadonlyMap<number, TodayAtRisk>;
	today: Date;
};

type AtRiskSession = {
	habitId: number;
	habit: Habit;
	info: TodayAtRisk;
	today: Date;
};

// An open sheet keeps the day it was opened on: crossing midnight neither changes what the person reads nor closes it.
// It cannot spend a freeze the grace window has closed on: the live read is rechecked on "Use a freeze".
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
		atRiskToday: session?.today,
		isFreezing,
		openAtRisk: (habitId: number) => {
			const info = atRiskByHabitId.get(habitId);
			const habit = habits.find((candidate) => candidate.id === habitId);
			if (info && habit) setSession({ habitId, habit, info, today });
		},
		spendFreeze,
		dismissAtRisk: () => setSession(null),
	};
}
