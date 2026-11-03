import { useAsyncAction } from "@/utils/use-async-action";
import { useFirstRunOfferStore } from "../first-run-offer-store";
import { firstRunCopy } from "../messages";
import { enableFirstHabitReminder } from "../services/first-run-service";

/** Answers FR3: Allow reminders (default reminder, then iOS) or Not now (nothing, and iOS is asked later, when a reminder is added). */
export function useFirstRunOfferActions() {
	const clear = useFirstRunOfferStore((state) => state.clear);
	const allow = useAsyncAction(enableFirstHabitReminder, {
		scope: "first-run",
		failure: firstRunCopy.offer.failed,
	});

	return {
		allow: allow.run,
		notNow: clear,
		clear,
	};
}
