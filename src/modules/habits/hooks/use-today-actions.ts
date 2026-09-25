import { useAsyncAction } from "@/utils/use-async-action";
import { setHabitCompletedOn } from "../repositories/entry-repository";

export function useTodayActions() {
	const toggle = useAsyncAction(setHabitCompletedOn);

	return {
		/** Toggles instantly — un-checking is always allowed, no confirmation (HAB-03). */
		toggleCompletion: toggle.execute,
		isToggling: toggle.isLoading,
		toggleError: toggle.error,
	};
}
