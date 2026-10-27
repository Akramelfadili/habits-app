import { useState } from "react";
import { showToast } from "@/store/toast-store";
import type { StreakAtRisk } from "../domain/streaks";
import type { Habit } from "../types";
import { useStreakActions } from "./use-streak-actions";

type TodayFreezeInput = {
	/** The habits on screen — the at-risk one is found among them. */
	habits: readonly Habit[];
	atRiskByHabitId: ReadonlyMap<number, StreakAtRisk>;
};

/**
 * Today's streak-at-risk flow (HAB-08): which habit's sheet is open, using a
 * freeze for the missed day (with an Undo for that same day) and dismissing
 * the sheet without writing anything.
 */
export function useTodayFreezeActions({
	habits,
	atRiskByHabitId,
}: TodayFreezeInput) {
	const { applyFreeze, undoFreeze, isFreezing } = useStreakActions();
	const [atRiskHabitId, setAtRiskHabitId] = useState<number | null>(null);

	const atRiskHabit = habits.find((habit) => habit.id === atRiskHabitId);
	const atRiskInfo =
		atRiskHabitId !== null ? atRiskByHabitId.get(atRiskHabitId) : undefined;

	async function spendFreeze() {
		if (atRiskHabitId === null || !atRiskInfo) return;
		const habit = atRiskHabit;
		const { missedDate } = atRiskInfo;
		const result = await applyFreeze(atRiskHabitId, missedDate);
		if (!result.ok) return;
		setAtRiskHabitId(null);
		// Undo takes the freeze back — for the missed day it was applied to.
		if (habit) {
			showToast({
				message: `Used a freeze on '${habit.name}'`,
				actionLabel: "Undo",
				onAction: () => undoFreeze(habit.id, missedDate),
			});
		}
	}

	return {
		atRiskInfo,
		isFreezing,
		openAtRisk: (habitId: number) => setAtRiskHabitId(habitId),
		spendFreeze,
		/** Closes the sheet and writes nothing. */
		dismissAtRisk: () => setAtRiskHabitId(null),
	};
}
