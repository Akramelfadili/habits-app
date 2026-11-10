import { weekWindow } from "@/utils/week-window";
import {
	canShowNextWeek,
	dayAfterWeekSwipe,
	type WeekStripDay,
	weekStripDays,
} from "../domain/week-strip";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useActiveHabits } from "../repositories/habit-repository";

// The strip has no browsing state of its own to get out of step with the selection: a swipe selects the same weekday in the other week (never later than today).
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
