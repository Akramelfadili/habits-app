import { create } from "zustand";

type HapticsState = {
	/** The Haptics switch (Settings › Appearance). On until the person turns it off. */
	enabled: boolean;
};

/** Read by `useHaptics`; written at launch and by the Settings switch (`src/utils/use-haptics.ts`). */
export const useHapticsStore = create<HapticsState>(() => ({ enabled: true }));
