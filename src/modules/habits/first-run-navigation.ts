import { useFirstRunOfferStore } from "./first-run-offer-store";

/** The slice of the router First Run's exits use. */
export type FirstRunRouter = {
	canDismiss: () => boolean;
	dismissAll: () => void;
	replace: (href: "/") => void;
};

/**
 * Leaves First Run for Today: every First Run screen is popped (they sit above
 * nothing but each other) and the tabs take their place, so Back and the swipe
 * can never return to the welcome. The tabs' gate reads the "seen" flag from a
 * live query that lags the write by a moment, so it is told First Run was left
 * (`leftFirstRun`) and does not redirect back on the stale flag.
 */
export function leaveFirstRun(router: FirstRunRouter): void {
	useFirstRunOfferStore.getState().setLeftFirstRun(true);
	if (router.canDismiss()) router.dismissAll();
	router.replace("/");
}
