import { create } from "zustand";

/** One transient message, optionally with a single inline action (e.g. "Undo"). */
export type ToastMessage = {
	message: string;
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
	showToast: (toast) => set({ toast: { ...toast, id: nextId++ } }),
	dismissToast: (id) =>
		set((state) => (state.toast?.id === id ? { toast: null } : state)),
}));

/** For callers outside React (and terse call sites): show a toast. */
export function showToast(toast: ToastMessage): void {
	useToastStore.getState().showToast(toast);
}
