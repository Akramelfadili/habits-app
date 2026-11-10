import { create } from "zustand";
import type { Habit } from "./types";

type FirstRunOfferState = {
	habit: Habit | null;
	// Set before the "seen" flag's live query catches up, so the tabs don't bounce back to
	// First Run on the stale flag.
	leftFirstRun: boolean;
	skipFailed: boolean;
	setSkipFailed: (failed: boolean) => void;
	offer: (habit: Habit) => void;
	clear: () => void;
	setLeftFirstRun: (left: boolean) => void;
};

export const useFirstRunOfferStore = create<FirstRunOfferState>((set) => ({
	habit: null,
	leftFirstRun: false,
	skipFailed: false,
	setSkipFailed: (skipFailed) => set({ skipFailed }),
	offer: (habit) => set({ habit }),
	clear: () => set({ habit: null }),
	setLeftFirstRun: (leftFirstRun) => set({ leftFirstRun }),
}));
