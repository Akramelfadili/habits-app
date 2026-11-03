import { useFirstRunOfferStore } from "./first-run-offer-store";

/** The slice of the router First Run's exits use. */
type FirstRunRouter = {
	canDismiss: () => boolean;
	dismissAll: () => void;
	replace: (href: "/") => void;
};

/**
 * Leaves First Run for Today: every First Run screen is popped (they sit above
 * nothing but each other) and the tabs take their place, so Back and the swipe
 * can never return to the welcome. FR3 and FR4 are drawn without the tab bar
 * (owner's decision over the frames), so Today hides it until a habit exists.
 */
export function leaveFirstRun(router: FirstRunRouter): void {
	useFirstRunOfferStore.getState().setLanding(true);
	if (router.canDismiss()) router.dismissAll();
	router.replace("/");
}
