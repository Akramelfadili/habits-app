import { create } from "zustand";

type HapticsState = {
	enabled: boolean;
};

/** Read by `useHaptics`; written at launch and by the Settings switch (`src/utils/use-haptics.ts`). */
export const useHapticsStore = create<HapticsState>(() => ({ enabled: true }));
