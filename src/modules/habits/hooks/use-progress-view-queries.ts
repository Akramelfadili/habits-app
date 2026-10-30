import { fromDayKey } from "@/utils/day-key";
import { useProgressViewStore } from "../progress-view-store";

/**
 * What the Progress tab is showing — read side of the view store (HAB-35–37):
 * the range, the habit filter and the ringed
 * day. It outlives the screen, so a tab switch never resets it.
 */
export function useProgressViewQueries() {
	const range = useProgressViewStore((state) => state.range);
	const habitId = useProgressViewStore((state) => state.habitId);
	const selectedKey = useProgressViewStore((state) => state.selectedDay);
	return {
		range,
		habitId,
		selectedKey,
		selectedDay: selectedKey ? fromDayKey(selectedKey) : null,
	};
}
