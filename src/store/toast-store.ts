import { create } from "zustand";

export type ToastTone = "info" | "success" | "warning" | "error";

export type ToastMessage = {
	message: string;
	tone?: ToastTone;
	actionLabel?: string;
	onAction?: () => void;
};

export type ShownToast = ToastMessage & { id: number };

type ToastState = {
	toast: ShownToast | null;
	// Replaces whatever is showing: only the most recent action is ever undoable.
	showToast: (toast: ToastMessage) => void;
	dismissToast: (id: number) => void;
	openSheets: number;
	registerSheet: () => () => void;
};

let nextId = 1;

// Outside any one screen so a toast can outlive the screen that caused it (archive pops back, the confirmation shows there).
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

export function showToast(toast: ToastMessage): void {
	useToastStore.getState().showToast(toast);
}
