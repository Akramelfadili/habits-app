import { useAsyncAction } from "@/utils/use-async-action";
import { applyFreeze as applyFreezeToRepository } from "../services/habit-service";

/**
 * Resolving the streak-at-risk prompt (HAB-08). "Reset and start today" has
 * no action here — it writes nothing, since the computed streak already
 * reflects an unfrozen miss correctly the next time it's read.
 */
export function useStreakActions() {
	const freeze = useAsyncAction(applyFreezeToRepository);

	return {
		applyFreeze: freeze.execute,
		isFreezing: freeze.isLoading,
		freezeError: freeze.error,
	};
}
