import { useAppSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import {
	FIRST_RUN_SUGGESTIONS,
	type FirstRunSuggestion,
	SEEN_FIRST_RUN_SETTING_KEY,
} from "../constants";

export function useFirstRunQueries(): {
	suggestions: FirstRunSuggestion[];
	hasSeenFirstRun: boolean;
} {
	const seenFlag = useAppSetting(SEEN_FIRST_RUN_SETTING_KEY);

	return {
		suggestions: FIRST_RUN_SUGGESTIONS,
		// `undefined` (still loading) is treated as "seen" so no flash of First
		// Run briefly appears before the real flag resolves — only a resolved
		// `null` (checked, and genuinely never set) counts as not-seen.
		hasSeenFirstRun: seenFlag !== null,
	};
}
