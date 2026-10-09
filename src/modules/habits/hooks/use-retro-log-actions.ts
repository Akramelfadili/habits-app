import { failureMessage } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { saveDayLog } from "../repositories/entry-repository";

/**
 * Single repository call — no service needed (HAB-10): the repository writes
 * the whole day in one transaction, and streaks/rate/heatmap are derived from
 * entries on read, so there's nothing else to recalculate or orchestrate.
 */
export function useRetroLogActions() {
	const save = useAsyncAction(saveDayLog, {
		scope: "retro-log",
		failure: failureMessage("save", "this day"),
	});

	return {
		saveDay: save.run,
		isSaving: save.isLoading,
		saveError: save.error,
	};
}
