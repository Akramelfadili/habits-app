import { failureMessage } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { setHabitQuantityOn } from "../repositories/entry-repository";

/** Single repository call — no service needed (HAB-07). */
export function useQuantityLogActions() {
	const log = useAsyncAction(setHabitQuantityOn, {
		scope: "quantity-log",
		failure: failureMessage("save", "that amount"),
	});

	return {
		logQuantity: log.run,
		isLogging: log.isLoading,
		logError: log.error,
	};
}
