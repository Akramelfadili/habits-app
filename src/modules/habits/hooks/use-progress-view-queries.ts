import { fromDayKey } from "@/utils/day-key";
import { useProgressViewStore } from "../progress-view-store";

// Backed by a store so the range, filter and ringed day outlive the screen: a tab switch never resets them.
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
