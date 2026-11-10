import { type FirstRunRouter, leaveFirstRun } from "../first-run-navigation";
import { useFirstRunOfferStore } from "../first-run-offer-store";
import { useFirstRunActions } from "./use-first-run-actions";

// The Close button sits in the root layout's header, which has no toast host, so a failed write is reported through the store and shown inline.
export function useFirstRunSkipActions() {
	const { markFirstRunSeen } = useFirstRunActions();
	const setSkipFailed = useFirstRunOfferStore((state) => state.setSkipFailed);

	async function skip(router: FirstRunRouter) {
		const result = await markFirstRunSeen();
		setSkipFailed(!result.ok);
		if (result.ok) leaveFirstRun(router);
	}

	return { skip };
}
