import { create } from "zustand";

type TabRetapState = {
	tab: string | null;
	// Rises on every re-tap, so tapping the same tab twice is two events.
	count: number;
	retap: (tab: string) => void;
};

// The pill raises the event and the screen answers it, because only the screen owns its scroll view and title.
export const useTabRetapStore = create<TabRetapState>((set) => ({
	tab: null,
	count: 0,
	retap: (tab) => set((state) => ({ tab, count: state.count + 1 })),
}));
