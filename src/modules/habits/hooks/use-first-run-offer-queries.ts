import { useFirstRunOfferStore } from "../first-run-offer-store";

export function useFirstRunOfferQueries() {
	return {
		habit: useFirstRunOfferStore((state) => state.habit),
		skipFailed: useFirstRunOfferStore((state) => state.skipFailed),
	};
}
