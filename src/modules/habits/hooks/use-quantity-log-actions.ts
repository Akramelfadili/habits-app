import { useAsyncAction } from "@/utils/use-async-action";
import { setHabitQuantityOn } from "../repositories/entry-repository";

/** Single repository call — no service needed (HAB-07). */
export function useQuantityLogActions() {
	const log = useAsyncAction(setHabitQuantityOn);

	return {
		logQuantity: log.execute,
		isLogging: log.isLoading,
		logError: log.error,
	};
}
