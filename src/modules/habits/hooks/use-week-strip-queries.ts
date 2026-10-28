import { endOfWeek, startOfWeek } from "date-fns";
import { useEffect, useState } from "react";
import { WEEK_STARTS_ON } from "../constants";
import {
	canShowNextWeek,
	shiftWeek,
	type WeekStripDay,
	weekStripDays,
} from "../domain/week-strip";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useActiveHabits } from "../repositories/habit-repository";

/**
 * The week strip's data (V3-03). The strip shows the week of the selected day
 * until the person swipes to another; choosing a day (or "Show today") puts it
 * back on the selection's week. Reads that week's entries, which may differ
 * from the selected day's week once swiped.
 *
 * Named `…Queries` for the hook-naming rule: `showPreviousWeek` / `showNextWeek`
 * only move which week the strip displays.
 */
export function useWeekStripQueries(
	selectedDay: Date,
	today: Date,
): {
	days: WeekStripDay[];
	canShowNext: boolean;
	showPreviousWeek: () => void;
	showNextWeek: () => void;
	/** −1, 0 or +1 from the last swipe, so the strip can slide the right way. */
	direction: number;
} {
	const [offset, setOffset] = useState(0);
	const [direction, setDirection] = useState(0);
	const selectedTime = selectedDay.getTime();
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new selection puts the strip back on its week
	useEffect(() => {
		setOffset(0);
		setDirection(0);
	}, [selectedTime]);

	const anchor = shiftWeek(selectedDay, offset);
	const { habits } = useActiveHabits();
	const entries = useEntriesInRange(
		startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }),
		endOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }),
	);
	const canShowNext = canShowNextWeek(anchor, today);

	return {
		days: weekStripDays(habits, entries, anchor, today),
		canShowNext,
		direction,
		showPreviousWeek: () => {
			setDirection(-1);
			setOffset((value) => value - 1);
		},
		showNextWeek: () => {
			if (!canShowNext) return;
			setDirection(1);
			setOffset((value) => value + 1);
		},
	};
}
