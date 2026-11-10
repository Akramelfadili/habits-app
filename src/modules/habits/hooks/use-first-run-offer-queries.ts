import { useFirstRunOfferStore } from "../first-run-offer-store";

/** The habit the notification pre-prompt is asking about, or null when no pre-prompt is due. */
export function useFirstRunOfferQueries() {
	return {
		habit: useFirstRunOfferStore((state) => state.habit),
		/** Close on the first-run form failed to leave First Run (the flag could not be written). */
		skipFailed: useFirstRunOfferStore((state) => state.skipFailed),
	};
}
