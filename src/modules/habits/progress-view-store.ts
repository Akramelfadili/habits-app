import { create } from "zustand";
import { toDayKey } from "@/utils/day-key";

export type ProgressRange = "week" | "month" | "year";

type ProgressViewState = {
	/** Which range the Progress tab shows; it survives switching tabs (HAB-35). */
	range: ProgressRange;
	/**
	 * The month Month shows, as the "yyyy-MM-dd" of its first day, when it was
	 * opened from Year; null means the current month (D15).
	 */
	monthKey: string | null;
	/** Month was opened from a Year month label: Back returns to Year (P13). */
	fromYear: boolean;
	/** The Year chip's habit; null is "All habits" (HP1/HP2). */
	habitId: number | null;
	/** The day ringed in Month, "yyyy-MM-dd", whose detail card is showing (P13). */
	selectedDay: string | null;
	setRange: (range: ProgressRange) => void;
	openMonthFromYear: (monthStart: Date) => void;
	backToYear: () => void;
	setHabit: (habitId: number | null) => void;
	selectDay: (day: Date | null) => void;
};

const INITIAL = {
	range: "week" as ProgressRange,
	monthKey: null,
	fromYear: false,
	habitId: null,
	selectedDay: null,
};

/**
 * The Progress tab's view state: which range, which month, which habit filter,
 * which day is ringed. A store, not screen state, so Week / Month / Year
 * survives a trip to another tab (the tab stays mounted, but a remount must not
 * lose it either). Picking Month from the switcher always means the current
 * month (D15); only a Year month label opens another.
 */
export const useProgressViewStore = create<ProgressViewState>((set) => ({
	...INITIAL,
	setRange: (range) =>
		set({ range, monthKey: null, fromYear: false, selectedDay: null }),
	openMonthFromYear: (monthStart) =>
		set({
			range: "month",
			monthKey: toDayKey(monthStart),
			fromYear: true,
			selectedDay: null,
		}),
	backToYear: () =>
		set({ range: "year", monthKey: null, fromYear: false, selectedDay: null }),
	setHabit: (habitId) => set({ habitId }),
	selectDay: (day) => set({ selectedDay: day ? toDayKey(day) : null }),
}));

/** Back to a fresh Progress tab (tests; a dev "reset"). */
export function resetProgressView(): void {
	useProgressViewStore.setState(INITIAL);
}
