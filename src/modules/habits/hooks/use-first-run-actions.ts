import {
	deleteSetting,
	setSetting,
} from "@/lib/app-settings/repositories/app-settings-repository";
import { failureMessage } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { SEEN_FIRST_RUN_SETTING_KEY } from "../constants";
import { deleteAllHabits } from "../repositories/habit-repository";
import { addSuggestedHabits } from "../services/first-run-service";

/** "Start from scratch" is a single repository write — no service needed for it. */
function skipFirstRun(): Promise<void> {
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
	const add = useAsyncAction(addSuggestedHabits, {
		scope: "first-run",
		failure: failureMessage("add", "those habits"),
	});
	const skip = useAsyncAction(skipFirstRun, {
		scope: "first-run",
		failure: "Couldn't continue. Try again.",
	});
	const reset = useAsyncAction(resetFirstRun, {
		scope: "first-run",
		failure: failureMessage("reset", "first run"),
	});

	return {
		addSuggestedHabits: add.run,
		isAdding: add.isLoading,
		addError: add.error,
		skipFirstRun: skip.run,
		isSkipping: skip.isLoading,
		skipError: skip.error,
		/** Dev-only escape hatch — undefined in production so callers can't wire it up by accident. */
		resetFirstRun: __DEV__ ? reset.run : undefined,
		isResetting: reset.isLoading,
	};
}
