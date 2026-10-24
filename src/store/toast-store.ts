import { create } from "zustand";

/** One transient message, optionally with a single inline action (e.g. "Undo"). */
export type ToastMessage = {
	message: string;
	/** "error" is the failed-write toast (design-system.md, Error tone). */
	tone?: "default" | "error";
	actionLabel?: string;
	onAction?: () => void;
};

type ShownToast = ToastMessage & { id: number };

type ToastState = {
	toast: ShownToast | null;
	/** Replaces whatever is showing — only the most recent action is ever undoable. */
	showToast: (toast: ToastMessage) => void;
	/** Clears the toast, but only if it's still the one with this id. */
	dismissToast: (id: number) => void;
	/** How many sheets (native Modals) are open — they cover the page-level host. */
	openSheets: number;
	/** A sheet calls this while visible; returns the release. */
	registerSheet: () => () => void;
};

let nextId = 1;

/**
 * UI-only state for the app's single toast slot. It lives outside any one
 * screen so a toast can outlive the screen that caused it — archiving from
 * Habit Detail pops back to Today or Manage, and the confirmation has to
 * show up there.
 */
export const useToastStore = create<ToastState>((set) => ({
	toast: null,
	openSheets: 0,
	registerSheet: () => {
		set((state) => ({ openSheets: state.openSheets + 1 }));
		let released = false;
		return () => {
			// Idempotent: a double release must not drive the count negative.
			if (released) return;
			released = true;
			set((state) => ({ openSheets: state.openSheets - 1 }));
		};
	},
	showToast: (toast) => set({ toast: { ...toast, id: nextId++ } }),
	dismissToast: (id) =>
		set((state) => (state.toast?.id === id ? { toast: null } : state)),
}));

/** For callers outside React (and terse call sites): show a toast. */
export function showToast(toast: ToastMessage): void {
	useToastStore.getState().showToast(toast);
}
