import { failureMessage } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { setQuantityOnDay } from "../services/day-log-service";

/**
 * A quantity write (HAB-07): a service because reaching the target on a
 * frozen day gives that day's freeze back in the same transaction (PR-11).
 */
export function useQuantityLogActions() {
	const log = useAsyncAction(setQuantityOnDay, {
		scope: "quantity-log",
		failure: failureMessage("save", "that amount"),
	});

	return {
		logQuantity: log.run,
		isLogging: log.isLoading,
		logError: log.error,
	};
}
