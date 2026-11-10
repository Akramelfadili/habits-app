import { format } from "date-fns";
import { useRef, useState } from "react";
import { MAX_QUANTITY_VALUE } from "../constants";
import { messages, showMessage } from "../messages";
import type { FrozenDay, Habit } from "../types";
import { useQuantityLogActions } from "./use-quantity-log-actions";
import { useTodayActions } from "./use-today-actions";

type QuantitySheetInput = {
	habit: Habit;
	// Fixed when the sheet opens, so a sheet left open across midnight keeps its date.
	day: Date;
	initial: number;
	dayLabel?: string;
	offSchedule?: boolean;
	onClosed: () => void;
};

// Writes run one after the other so the last one wins; closing shows one toast whose Undo restores the amount from before the sheet opened.
export function useQuantitySheetActions({
	habit,
	day,
	initial,
	dayLabel,
	offSchedule = false,
	onClosed,
}: QuantitySheetInput) {
	const { logQuantity } = useQuantityLogActions();
	const { restoreDay } = useTodayActions();
	const [amount, setAmountState] = useState(initial);
	const [pending, setPending] = useState(0);
	const before = useRef(initial);
	const saved = useRef(initial);
	const freeze = useRef<{ freeze: FrozenDay; freezesLeft: number } | null>(
		null,
	);
	const queue = useRef<Promise<void>>(Promise.resolve());
	const target = habit.targetAmount ?? 0;

	function setAmount(next: number) {
		const clamped = Math.min(MAX_QUANTITY_VALUE, Math.max(0, Math.round(next)));
		setAmountState(clamped);
		setPending((count) => count + 1);
		queue.current = queue.current.then(async () => {
			const result = await logQuantity(
				habit.id,
				day,
				clamped,
				habit.targetAmount,
			);
			if (result.ok) {
				saved.current = clamped;
				if (result.value.returnedFreeze && !freeze.current) {
					freeze.current = {
						freeze: result.value.returnedFreeze,
						freezesLeft: result.value.freezesLeft,
					};
				}
			} else {
				setAmountState(saved.current);
			}
		});
		queue.current = queue.current.then(() => setPending((count) => count - 1));
	}

	async function close() {
		await queue.current;
		const final = saved.current;
		const start = before.current;
		if (final !== start) {
			const returned = freeze.current;
			const undo = () =>
				restoreDay(habit.id, day, start, returned?.freeze ?? null);
			if (returned) {
				showMessage(
					messages.freezeReturned,
					[format(day, "EEE d"), returned.freezesLeft],
					undo,
				);
			} else if (offSchedule) {
				if (final > 0)
					showMessage(messages.offSchedule, [habit.name, dayLabel], undo);
			} else if (start < target && final >= target) {
				showMessage(messages.completed, [habit.name, dayLabel], undo);
			} else if (start >= target && final < target) {
				showMessage(messages.notCompleted, [habit.name, dayLabel], undo);
			} else {
				showMessage(
					messages.quantitySet,
					[habit.name, final, target, habit.targetUnit, dayLabel],
					undo,
				);
			}
		}
		onClosed();
	}

	return { amount, setAmount, close, isSaving: pending > 0, target };
}
