import { useFirstRunOfferStore } from "../first-run-offer-store";

/** The habit FR3 is asking about, or null when no pre-prompt is due. */
export function useFirstRunOfferQueries() {
	return { habit: useFirstRunOfferStore((state) => state.habit) };
}
