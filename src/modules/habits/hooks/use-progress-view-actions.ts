import { useProgressViewStore } from "../progress-view-store";

/** The write side of the Progress view state: change range, filter, ring a day. */
export function useProgressViewActions() {
	const setRange = useProgressViewStore((state) => state.setRange);
	const setHabit = useProgressViewStore((state) => state.setHabit);
	const selectDay = useProgressViewStore((state) => state.selectDay);
	return { setRange, setHabit, selectDay };
}
