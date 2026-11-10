import { create } from "zustand";
import { toDayKey } from "@/utils/day-key";

export type ProgressRange = "week" | "month" | "year";

type ProgressViewState = {
	range: ProgressRange;
	habitId: number | null;
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

export const useProgressViewStore = create<ProgressViewState>((set) => ({
	...INITIAL,
	setRange: (range) => set({ range, selectedDay: null }),
	setHabit: (habitId) => set({ habitId }),
	selectDay: (day) => set({ selectedDay: day ? toDayKey(day) : null }),
}));

export function resetProgressView(): void {
	useProgressViewStore.setState(INITIAL);
}
