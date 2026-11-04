import { create } from "zustand";
import type { Habit } from "./types";

type FirstRunOfferState = {
	/** The first habit, waiting for the person's answer to "Remind you each day?" (FR3); null when nothing is offered. */
	habit: Habit | null;
	/**
	 * Set the moment First Run is left, before the "seen" flag's live query has
	 * caught up: until the gate reads "done", the tabs must not bounce back to
	 * First Run on the stale flag (the skip flake). Cleared once the gate agrees.
	 */
	leftFirstRun: boolean;
	/** The Close on FR2 (a skip) could not write the "seen" flag: FR2 says so inline. */
	skipFailed: boolean;
	setSkipFailed: (failed: boolean) => void;
	offer: (habit: Habit) => void;
	clear: () => void;
	setLeftFirstRun: (left: boolean) => void;
};

/**
 * The reminder pre-prompt outlives the screen that raised it: the first habit
 * is saved on a First Run screen, which then hands over to Today, and Today
 * asks. A store, like the progress view's, so the hand-over is one call.
 */
export const useFirstRunOfferStore = create<FirstRunOfferState>((set) => ({
	habit: null,
	leftFirstRun: false,
	skipFailed: false,
	setSkipFailed: (skipFailed) => set({ skipFailed }),
	offer: (habit) => set({ habit }),
	clear: () => set({ habit: null }),
	setLeftFirstRun: (leftFirstRun) => set({ leftFirstRun }),
}));
