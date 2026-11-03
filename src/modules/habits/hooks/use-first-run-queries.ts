import { useAppSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { SEEN_FIRST_RUN_SETTING_KEY } from "../constants";
import {
	type FirstRunGate,
	firstRunGate,
	shouldMarkSeen,
} from "../domain/first-run-gate";
import { useHabitsList } from "../repositories/habit-repository";

/**
 * Where the app opens (HAB-46): First Run, or the tabs. Reads the "seen"
 * flag and the habit list (archived included) and lets the pure gate decide;
 * `needsSeenMark` is true for an install that has habits but never wrote the
 * flag, which the tabs shell writes once.
 */
export function useFirstRunQueries(): {
	gate: FirstRunGate;
	needsSeenMark: boolean;
} {
	const seenFlag = useAppSetting(SEEN_FIRST_RUN_SETTING_KEY);
	const { habits, loaded } = useHabitsList();
	const state = { seenFlag, habitCount: loaded ? habits.length : undefined };
	return { gate: firstRunGate(state), needsSeenMark: shouldMarkSeen(state) };
}
