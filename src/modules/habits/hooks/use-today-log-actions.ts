import { format, isSameDay } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { log } from "@/lib/logger/logger";
import { currentDay } from "@/lib/today/use-today";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { MAX_QUANTITY_VALUE } from "../constants";
import { messages, showMessage } from "../messages";
import { useEntriesInRange } from "../repositories/entry-repository";
import type { DayWrite } from "../services/day-log-service";
import type { Habit } from "../types";
import { useQuantityLogActions } from "./use-quantity-log-actions";
import { useTodayActions } from "./use-today-actions";

type TodayLogInput = {
	/** The real today — a write to it is skipped if the clock has moved past this render's. */
	today: Date;
	selectedKey: string | null;
	completedHabitIds: ReadonlySet<number>;
	quantityValuesByHabitId: ReadonlyMap<number, number>;
	loggableHabits: readonly Habit[];
};

// Owns the quantity sheet's open state because both the populated list and the rest-day picker open it.
export function useTodayLogActions({
	today,
	selectedKey,
	completedHabitIds,
	quantityValuesByHabitId,
	loggableHabits,
}: TodayLogInput) {
	const { toggleCompletion, restoreDay } = useTodayActions();
	const { logQuantity } = useQuantityLogActions();
	// The open quantity sheet: its day is fixed when it opens, so a sheet left open across
	// midnight keeps its date.
	const [quantitySession, setQuantitySession] = useState<{
		habitId: number;
		day: Date;
		offSchedule: boolean;
	} | null>(null);
	// +1 taps whose write has not come back through the live query yet, so a quick
	// second tap adds to the first instead of repeating it.
	const pendingAmounts = useRef(new Map<number, number>());
	// biome-ignore lint/correctness/useExhaustiveDependencies: a fresh read from the database supersedes any pending amount
	useEffect(() => {
		pendingAmounts.current.clear();
	}, [quantityValuesByHabitId]);

	const quantityHabit = loggableHabits.find(
		(habit) => habit.id === quantitySession?.habitId,
	);
	// The open sheet reads its own day's entry, not the shown day's: across midnight the screen
	// moves on, the sheet does not.
	const sheetDay = quantitySession?.day ?? today;
	const sheetEntries = useEntriesInRange(sheetDay, sheetDay);
	const sheetValue =
		sheetEntries.find(
			(entry) =>
				entry.habitId === quantityHabit?.id &&
				entry.date === toDayKey(sheetDay),
		)?.value ?? 0;

	const dayLabel =
		selectedKey === null
			? undefined
			: format(fromDayKey(selectedKey), "EEE d MMM");
	const sheetDayLabel =
		quantitySession && !isSameDay(quantitySession.day, today)
			? format(quantitySession.day, "EEE d MMM")
			: dayLabel;

	function confirmCompletion(habit: Habit, undo: () => unknown) {
		// A Break habit is resisted, never "complete".
		const spec =
			habit.direction === "break" ? messages.resisted : messages.completed;
		showMessage(spec, [habit.name, dayLabel], undo);
	}

	function confirmUncompletion(habit: Habit, undo: () => unknown) {
		const spec =
			habit.direction === "break"
				? messages.notResisted
				: messages.notCompleted;
		showMessage(spec, [habit.name, dayLabel], undo);
	}

	function confirmOffSchedule(habit: Habit, undo: () => unknown) {
		showMessage(messages.offSchedule, [habit.name, dayLabel], undo);
	}

	// A write that gave a frozen day's freeze back says so instead (one toast at a time); its Undo puts both back.
	function confirmWrite(
		habit: Habit,
		day: Date,
		write: DayWrite,
		previous: boolean | number,
		confirm: (undo: () => unknown) => void,
	) {
		const undo = () =>
			restoreDay(habit.id, day, previous, write.returnedFreeze ?? null);
		if (write.returnedFreeze) {
			showMessage(
				messages.freezeReturned,
				[format(day, "EEE d"), write.freezesLeft],
				undo,
			);
		} else {
			confirm(undo);
		}
	}

	// Read from the clock at tap time: if the app was left open across midnight and this render still shows yesterday, the write is skipped, so a tap never lands on a day the person isn't looking at.
	function writableDay(): Date | null {
		if (selectedKey !== null) return fromDayKey(selectedKey);
		const day = currentDay();
		if (isSameDay(day, today)) return day;
		log.info("today.write_skipped_day_rollover");
		return null;
	}

	async function toggle(habit: Habit) {
		const day = writableDay();
		if (!day) return;
		const completing = !completedHabitIds.has(habit.id);
		const result = await toggleCompletion(habit.id, day, completing);
		if (!result.ok) return;
		confirmWrite(habit, day, result.value, !completing, (undo) =>
			completing
				? confirmCompletion(habit, undo)
				: confirmUncompletion(habit, undo),
		);
	}

	// No step log: one entry per habit per day holds the total.
	async function addOne(habit: Habit) {
		const day = writableDay();
		if (!day) return;
		const previous =
			pendingAmounts.current.get(habit.id) ??
			quantityValuesByHabitId.get(habit.id) ??
			0;
		if (previous >= MAX_QUANTITY_VALUE) return;
		const next = previous + 1;
		pendingAmounts.current.set(habit.id, next);
		const result = await logQuantity(habit.id, day, next, habit.targetAmount);
		if (!result.ok) {
			pendingAmounts.current.delete(habit.id);
			return;
		}
		confirmWrite(habit, day, result.value, previous, (undo) =>
			showMessage(
				messages.quantityAdded,
				[habit.name, next, habit.targetAmount ?? 0, habit.targetUnit, dayLabel],
				undo,
			),
		);
	}

	function openQuantitySheet(habitId: number) {
		const day = writableDay();
		if (!day) return;
		setQuantitySession({ habitId, day, offSchedule: false });
	}

	function dismissQuantitySheet() {
		setQuantitySession(null);
	}

	async function logOffSchedule(habit: Habit) {
		if (habit.targetType === "quantity") {
			const quantityDay = writableDay();
			if (quantityDay) {
				setQuantitySession({
					habitId: habit.id,
					day: quantityDay,
					offSchedule: true,
				});
			}
			return;
		}
		const day = writableDay();
		if (!day) return;
		const result = await toggleCompletion(habit.id, day, true);
		if (!result.ok) return;
		confirmWrite(habit, day, result.value, false, (undo) =>
			confirmOffSchedule(habit, undo),
		);
	}

	return {
		toggle,
		addOne,
		quantitySheet:
			quantityHabit && quantitySession
				? {
						habit: quantityHabit,
						value: sheetValue,
						day: quantitySession.day,
						dayLabel: sheetDayLabel,
						offSchedule: quantitySession.offSchedule,
					}
				: null,
		openQuantitySheet,
		dismissQuantitySheet,
		logOffSchedule,
	};
}
