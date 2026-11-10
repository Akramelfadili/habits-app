import { useFirstRunOfferStore } from "./first-run-offer-store";

export type FirstRunRouter = {
	canDismiss: () => boolean;
	dismissAll: () => void;
	replace: (href: "/") => void;
};

// The tabs' gate reads a live query that lags the write, so it is told First Run was left
// (`leftFirstRun`) rather than redirecting back on the stale flag.
export function leaveFirstRun(router: FirstRunRouter): void {
	useFirstRunOfferStore.getState().setLeftFirstRun(true);
	if (router.canDismiss()) router.dismissAll();
	router.replace("/");
}
