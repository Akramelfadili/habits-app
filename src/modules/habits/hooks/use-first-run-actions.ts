import {
	deleteSetting,
	setSetting,
} from "@/lib/app-settings/repositories/app-settings-repository";
import { failureMessage } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { SEEN_FIRST_RUN_SETTING_KEY } from "../constants";
import { firstRunCopy } from "../messages";
import { deleteAllHabits } from "../repositories/habit-repository";

/**
 * Writes the flag that keeps First Run from ever coming back (HAB-46): after
 * a first habit is saved, when First Run is skipped, and once for an install
 * that already had habits. One repository write — no service needed.
 */
function markFirstRunSeen(): Promise<void> {
	return setSetting(SEEN_FIRST_RUN_SETTING_KEY, "true");
}

/**
 * Dev-only: clears every habit and un-sets the "seen first run" flag together,
 * so First Run shows again on the next render — both underlying calls already
 * refuse to run outside `__DEV__`.
 */
async function resetFirstRun(): Promise<void> {
	await deleteAllHabits();
	await deleteSetting(SEEN_FIRST_RUN_SETTING_KEY);
}

export function useFirstRunActions() {
	const seen = useAsyncAction(markFirstRunSeen, {
		scope: "first-run",
		failure: firstRunCopy.continueFailed,
	});
	const reset = useAsyncAction(resetFirstRun, {
		scope: "first-run",
		failure: failureMessage("reset", "first run"),
	});

	return {
		/** Resolves `{ ok }`: the caller goes on to Today only when the flag is written. */
		markFirstRunSeen: seen.run,
		isMarking: seen.isLoading,
		markError: seen.error,
		/** Dev-only escape hatch — undefined in production so callers can't wire it up by accident. */
		resetFirstRun: __DEV__ ? reset.run : undefined,
		isResetting: reset.isLoading,
	};
}
