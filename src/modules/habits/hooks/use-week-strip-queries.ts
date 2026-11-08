import { weekWindow } from "@/utils/week-window";
import {
	canShowNextWeek,
	dayAfterWeekSwipe,
	type WeekStripDay,
	weekStripDays,
} from "../domain/week-strip";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useActiveHabits } from "../repositories/habit-repository";

/**
 * The week strip's data (V3-03). The strip always shows the week of the
 * selected day — there is no browsing state of its own to get out of step with
 * the selection. A swipe to another week selects the same weekday there
 * (never later than today), so "Logging for …" says where logs will go.
 *
 * Named `…Queries` for the hook-naming rule: `showPreviousWeek` / `showNextWeek`
 * only move the selection through `onSelect`.
 */
export function useWeekStripQueries(
	selectedDay: Date,
	today: Date,
	onSelect: (day: Date) => void,
): {
	days: WeekStripDay[];
	canShowNext: boolean;
	showPreviousWeek: () => void;
	showNextWeek: () => void;
} {
	const { habits } = useActiveHabits();
	const week = weekWindow(selectedDay);
	const entries = useEntriesInRange(week.start, week.end);
	const go = (weeks: -1 | 1) => {
		const next = dayAfterWeekSwipe(selectedDay, today, weeks);
		if (next) onSelect(next);
	};

	return {
		days: weekStripDays(habits, entries, selectedDay, today),
		canShowNext: canShowNextWeek(selectedDay, today),
		showPreviousWeek: () => go(-1),
		showNextWeek: () => go(1),
	};
}
