/** The slice of the router First Run's exits use. */
type FirstRunRouter = {
	canDismiss: () => boolean;
	dismissAll: () => void;
	replace: (href: "/") => void;
};

/**
 * Leaves First Run for Today: every First Run screen is popped (they sit above
 * nothing but each other) and the tabs take their place, so Back and the swipe
 * can never return to the welcome. The tab bar is only drawn from here on.
 */
export function leaveFirstRun(router: FirstRunRouter): void {
	if (router.canDismiss()) router.dismissAll();
	router.replace("/");
}
