import { useProgressViewStore } from "../progress-view-store";

/** The write side of the Progress view state: change range, open a Year month, filter, ring a day. */
export function useProgressViewActions() {
	const setRange = useProgressViewStore((state) => state.setRange);
	const openMonthFromYear = useProgressViewStore(
		(state) => state.openMonthFromYear,
	);
	const backToYear = useProgressViewStore((state) => state.backToYear);
	const setHabit = useProgressViewStore((state) => state.setHabit);
	const selectDay = useProgressViewStore((state) => state.selectDay);
	return { setRange, openMonthFromYear, backToYear, setHabit, selectDay };
}
