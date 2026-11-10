import { failureMessage, UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { unfreezeHabitDay } from "../repositories/frozen-day-repository";
import { applyFreeze as applyFreezeToRepository } from "../services/freeze-service";

// "Not now" has no action: the computed streak already reflects an unfrozen miss the next time it is read.
export function useStreakActions() {
	const freeze = useAsyncAction(applyFreezeToRepository, {
		scope: "streak",
		failure: failureMessage("use", "a freeze"),
	});

	const undo = useAsyncAction(unfreezeHabitDay, {
		scope: "streak",
		failure: UNDO_FAILED_MESSAGE,
	});

	return {
		applyFreeze: freeze.run,
		undoFreeze: undo.run,
		isFreezing: freeze.isLoading,
		freezeError: freeze.error,
	};
}
