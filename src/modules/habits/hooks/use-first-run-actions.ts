import { setSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { useAsyncAction } from "@/utils/use-async-action";
import { SEEN_FIRST_RUN_SETTING_KEY } from "../constants";
import { firstRunCopy } from "../messages";

/**
 * Writes the flag that keeps First Run from ever coming back (HAB-46): after
 * a first habit is saved, when First Run is skipped, and once for an install
 * that already had habits. One repository write — no service needed.
 */
function markFirstRunSeen(): Promise<void> {
	return setSetting(SEEN_FIRST_RUN_SETTING_KEY, "true");
}

export function useFirstRunActions() {
	const seen = useAsyncAction(markFirstRunSeen, {
		scope: "first-run",
		failure: firstRunCopy.continueFailed,
	});

	return {
		/** Resolves `{ ok }`: the caller goes on to Today only when the flag is written. */
		markFirstRunSeen: seen.run,
		isMarking: seen.isLoading,
		markError: seen.error,
	};
}
