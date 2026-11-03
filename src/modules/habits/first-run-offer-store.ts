import { create } from "zustand";
import type { Habit } from "./types";

type FirstRunOfferState = {
	/** The first habit, waiting for the person's answer to "Remind you each day?" (FR3); null when nothing is offered. */
	habit: Habit | null;
	/** True from leaving First Run until the first habit exists: FR3 and FR4 are drawn without the tab bar. */
	landing: boolean;
	offer: (habit: Habit) => void;
	clear: () => void;
	setLanding: (landing: boolean) => void;
};

/**
 * The reminder pre-prompt outlives the screen that raised it: the first habit
 * is saved on a First Run screen, which then hands over to Today, and Today
 * asks. A store, like the progress view's, so the hand-over is one call.
 */
export const useFirstRunOfferStore = create<FirstRunOfferState>((set) => ({
	habit: null,
	landing: false,
	offer: (habit) => set({ habit }),
	clear: () => set({ habit: null }),
	setLanding: (landing) => set({ landing }),
}));
