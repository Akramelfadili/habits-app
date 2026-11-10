import { failureMessage, UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { unfreezeHabitDay } from "../repositories/frozen-day-repository";
import { applyFreeze as applyFreezeToRepository } from "../services/freeze-service";

/**
 * Resolving the streak-at-risk prompt. "Not now" has no action here: it writes nothing, since
 * the computed streak already reflects an unfrozen miss correctly the next time it's read.
 */
export function useStreakActions() {
	const freeze = useAsyncAction(applyFreezeToRepository, {
		scope: "streak",
		failure: failureMessage("use", "a freeze"),
	});

	// A single repository call, so no service (architecture rule 3).
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
