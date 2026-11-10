import { useProgressViewStore } from "../progress-view-store";

export function useProgressViewActions() {
	const setRange = useProgressViewStore((state) => state.setRange);
	const setHabit = useProgressViewStore((state) => state.setHabit);
	const selectDay = useProgressViewStore((state) => state.selectDay);
	return { setRange, setHabit, selectDay };
}
