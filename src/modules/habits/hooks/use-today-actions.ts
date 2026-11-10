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
		// Never rejects: a failure resolves `{ ok: false }` so the caller skips its Undo toast.
		toggleCompletion: toggle.run,
		restoreDay: restore.run,
		isToggling: toggle.isLoading,
		toggleError: toggle.error,
	};
}
