import { failureMessage, UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { restoreDay, setCheckOnDay } from "../services/day-log-service";

export function useTodayActions() {
	const toggle = useAsyncAction(setCheckOnDay, {
		scope: "today",
		failure: failureMessage("update", "this habit"),
	});
	const restore = useAsyncAction(restoreDay, {
		scope: "today",
		failure: UNDO_FAILED_MESSAGE,
	});

	return {
		/**
		 * Toggles instantly — un-checking is always allowed, no confirmation
		 * (HAB-03). Never rejects: a failure is logged and toasted, and resolves
		 * `{ ok: false }` so the caller skips its Undo toast. Ticking a frozen day
		 * returns its freeze; the result says so (PR-11).
		 */
		toggleCompletion: toggle.run,
		/** The Undo of any Today write: the day as it was, and a returned freeze taken again. */
		restoreDay: restore.run,
		isToggling: toggle.isLoading,
		toggleError: toggle.error,
	};
}
