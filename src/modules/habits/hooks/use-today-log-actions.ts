import { isSameDay } from "date-fns";
import { useState } from "react";
import { log } from "@/lib/logger/logger";
import { currentDay } from "@/lib/today/use-today";
import { showToast } from "@/store/toast-store";
import type { Habit } from "../types";
import { useQuantityLogActions } from "./use-quantity-log-actions";
import { useTodayActions } from "./use-today-actions";

type TodayLogInput = {
	/** The day this render shows — a write is skipped if the clock has moved past it. */
	today: Date;
	completedHabitIds: ReadonlySet<number>;
	quantityValuesByHabitId: ReadonlyMap<number, number>;
	/** Every habit a quantity sheet can be opened for: the due ones plus the rest-day picker's. */
	loggableHabits: readonly Habit[];
};

/**
 * Today's logging: toggling a check, saving a quantity, and a rest-day bonus
 * log — each with its Undo toast. Owns the quantity sheet's open state because
 * both the populated list and the rest-day picker open it.
 */
export function useTodayLogActions({
	today,
	completedHabitIds,
	quantityValuesByHabitId,
	loggableHabits,
}: TodayLogInput) {
	const { toggleCompletion } = useTodayActions();
	const { logQuantity, isLogging } = useQuantityLogActions();
	const [quantityHabitId, setQuantityHabitId] = useState<number | null>(null);
	const [quantityIsOffSchedule, setQuantityIsOffSchedule] = useState(false);

	const quantityHabit = loggableHabits.find(
		(habit) => habit.id === quantityHabitId,
	);

	// Every completion confirms itself with a short-lived Undo (design system,
	// "Feedback"). The toast lives in the shell's shared slot.
	function confirmCompletion(habit: Habit, undo: () => unknown) {
		showToast({
			// A Break habit is resisted, never "complete" (HAB-04).
			message:
				habit.direction === "break"
					? `Resisted '${habit.name}'`
					: `Marked '${habit.name}' complete`,
			actionLabel: "Undo",
			onAction: undo,
		});
	}

	// Un-ticking is as instant as ticking (HAB-03), and as undoable: the toast
	// puts the habit back as it was, on the day of the tap. A newer toast
	// replaces this one, and once it expires there is nothing left to undo.
	function confirmUncompletion(habit: Habit, undo: () => unknown) {
		showToast({
			message:
				habit.direction === "break"
					? `Marked '${habit.name}' not resisted`
					: `Marked '${habit.name}' not complete`,
			actionLabel: "Undo",
			onAction: undo,
		});
	}

	// A bonus log confirms itself the same way; Undo removes exactly that entry
	// (nothing was applied to streaks, so there is nothing else to reverse).
	function confirmOffSchedule(habit: Habit, undo: () => unknown) {
		showToast({
			message: `Logged '${habit.name}' · off-schedule`,
			actionLabel: "Undo",
			onAction: undo,
		});
	}

	/**
	 * The day a write lands on, read from the clock at the moment of the tap.
	 * If the app was left open across midnight and this render still shows
	 * yesterday, the write is skipped — the screen is about to refresh to the
	 * new day (`useToday`), and a tap must never land on a day the person
	 * isn't looking at. An Undo keeps the day of its own action, not this one.
	 */
	function writableDay(): Date | null {
		const day = currentDay();
		if (isSameDay(day, today)) return day;
		log.info("today", "write skipped: the day rolled over since this render");
		return null;
	}

	async function toggle(habit: Habit) {
		const day = writableDay();
		if (!day) return;
		const completing = !completedHabitIds.has(habit.id);
		const result = await toggleCompletion(habit.id, day, completing);
		if (!result.ok) return;
		if (completing) {
			confirmCompletion(habit, () => toggleCompletion(habit.id, day, false));
		} else {
			confirmUncompletion(habit, () => toggleCompletion(habit.id, day, true));
		}
	}

	function openQuantitySheet(habitId: number) {
		setQuantityHabitId(habitId);
	}

	function dismissQuantitySheet() {
		setQuantityHabitId(null);
		setQuantityIsOffSchedule(false);
	}

	/** The rest-day picker's pick: a quantity habit opens its sheet, anything else logs at once. */
	async function logOffSchedule(habit: Habit) {
		if (habit.targetType === "quantity") {
			setQuantityIsOffSchedule(true);
			setQuantityHabitId(habit.id);
			return;
		}
		const day = writableDay();
		if (!day) return;
		const result = await toggleCompletion(habit.id, day, true);
		if (!result.ok) return;
		confirmOffSchedule(habit, () => toggleCompletion(habit.id, day, false));
	}

	async function saveQuantity(value: number) {
		if (!quantityHabit) return;
		const habit = quantityHabit;
		const day = writableDay();
		if (!day) return;
		const previous = quantityValuesByHabitId.get(habit.id) ?? 0;
		const target = habit.targetAmount ?? 0;
		const result = await logQuantity(habit.id, day, value);
		// On failure the sheet stays open with its error toast, so a retry is one tap.
		if (!result.ok) return;
		dismissQuantitySheet();
		if (quantityIsOffSchedule) {
			// Undo restores the amount from before — or removes the entry if none.
			if (value > 0) {
				confirmOffSchedule(habit, () => logQuantity(habit.id, day, previous));
			}
			return;
		}
		// Only the save that crosses the target counts as "completing" it — and
		// the one that drops back below it as "un-completing". Either way Undo
		// restores the exact amount logged before.
		if (previous < target && value >= target) {
			confirmCompletion(habit, () => logQuantity(habit.id, day, previous));
		} else if (previous >= target && value < target) {
			confirmUncompletion(habit, () => logQuantity(habit.id, day, previous));
		}
	}

	return {
		toggle,
		quantityHabit,
		quantityValue: quantityHabit
			? (quantityValuesByHabitId.get(quantityHabit.id) ?? 0)
			: 0,
		openQuantitySheet,
		dismissQuantitySheet,
		saveQuantity,
		logOffSchedule,
		isLogging,
	};
}
