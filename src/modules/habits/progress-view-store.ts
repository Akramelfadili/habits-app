import { create } from "zustand";
import { toDayKey } from "@/utils/day-key";

export type ProgressRange = "week" | "month" | "year";

type ProgressViewState = {
	/** Which range the Progress tab shows; it survives switching tabs. */
	range: ProgressRange;
	/** The Year chip's habit; null is "All habits". */
	habitId: number | null;
	/** The day ringed in Month, "yyyy-MM-dd", whose detail card is showing. */
	selectedDay: string | null;
	setRange: (range: ProgressRange) => void;
	setHabit: (habitId: number | null) => void;
	selectDay: (day: Date | null) => void;
};

const INITIAL = {
	range: "week" as ProgressRange,
	habitId: null,
	selectedDay: null,
};

/**
 * The Progress tab's view state: which range, which habit filter, which day is ringed. A
 * store, not screen state, so Week / Month / Year survives a trip to another tab. Month from
 * the switcher is always the current month; any other month is its own pushed route, opened
 * from a Year label (`/month/...`).
 */
export const useProgressViewStore = create<ProgressViewState>((set) => ({
	...INITIAL,
	setRange: (range) => set({ range, selectedDay: null }),
	setHabit: (habitId) => set({ habitId }),
	selectDay: (day) => set({ selectedDay: day ? toDayKey(day) : null }),
}));

/** Back to a fresh Progress tab (tests; a dev "reset"). */
export function resetProgressView(): void {
	useProgressViewStore.setState(INITIAL);
}
