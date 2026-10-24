import { failureMessage } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { setHabitCompletedOn } from "../repositories/entry-repository";

export function useTodayActions() {
	const toggle = useAsyncAction(setHabitCompletedOn, {
		scope: "today",
		failure: failureMessage("update", "this habit"),
	});

	return {
		/**
		 * Toggles instantly — un-checking is always allowed, no confirmation
		 * (HAB-03). Never rejects: a failure is logged and toasted, and resolves
		 * `{ ok: false }` so the caller skips its Undo toast.
		 */
		toggleCompletion: toggle.run,
		isToggling: toggle.isLoading,
		toggleError: toggle.error,
	};
}
