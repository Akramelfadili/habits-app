import { failureMessage } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { saveDayReturningFreezes } from "../services/day-log-service";

/**
 * Saves a whole day (HAB-10) through the service that also gives back the
 * freeze of any frozen habit the save completes (PR-11). Streaks, rate and
 * heatmap are derived from entries on read, so there is nothing else to
 * recalculate.
 */
export function useRetroLogActions() {
	const save = useAsyncAction(saveDayReturningFreezes, {
		scope: "retro-log",
		failure: failureMessage("save", "this day"),
	});

	return {
		saveDay: save.run,
		isSaving: save.isLoading,
		saveError: save.error,
	};
}
