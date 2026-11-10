import { create } from "zustand";

type TabRetapState = {
	/** The tab that was tapped while already selected (a route name such as "(today)"); null until one is. */
	tab: string | null;
	/** Rises by one on every re-tap, so tapping the same tab twice is two events. */
	count: number;
	retap: (tab: string) => void;
};

/**
 * Re-tapping the selected tab scrolls it to the top and puts the screen reader on its title.
 * The pill raises the event; the tab's screen answers it (`useOnTabRetap`), because only the
 * screen owns its scroll view and title.
 */
export const useTabRetapStore = create<TabRetapState>((set) => ({
	tab: null,
	count: 0,
	retap: (tab) => set((state) => ({ tab, count: state.count + 1 })),
}));
