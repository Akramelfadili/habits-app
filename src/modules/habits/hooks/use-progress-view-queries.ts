import { fromDayKey } from "@/utils/day-key";
import { useProgressViewStore } from "../progress-view-store";

/**
 * What the Progress tab is showing — read side of the view store (HAB-35–37):
 * the range, the month Year opened (as a date), the habit filter and the ringed
 * day. It outlives the screen, so a tab switch never resets it.
 */
export function useProgressViewQueries() {
	const range = useProgressViewStore((state) => state.range);
	const monthKey = useProgressViewStore((state) => state.monthKey);
	const fromYear = useProgressViewStore((state) => state.fromYear);
	const habitId = useProgressViewStore((state) => state.habitId);
	const selectedKey = useProgressViewStore((state) => state.selectedDay);
	return {
		range,
		/** Month's month when it was opened from Year; null is the current month. */
		month: monthKey ? fromDayKey(monthKey) : null,
		fromYear,
		habitId,
		selectedKey,
		selectedDay: selectedKey ? fromDayKey(selectedKey) : null,
	};
}
