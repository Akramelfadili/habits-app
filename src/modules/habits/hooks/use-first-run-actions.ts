import { setSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { useAsyncAction } from "@/utils/use-async-action";
import { SEEN_FIRST_RUN_SETTING_KEY } from "../constants";
import { firstRunCopy } from "../messages";

function markFirstRunSeen(): Promise<void> {
	return setSetting(SEEN_FIRST_RUN_SETTING_KEY, "true");
}

export function useFirstRunActions() {
	const seen = useAsyncAction(markFirstRunSeen, {
		scope: "first-run",
		failure: firstRunCopy.continueFailed,
	});

	return {
		markFirstRunSeen: seen.run,
		isMarking: seen.isLoading,
		markError: seen.error,
	};
}
