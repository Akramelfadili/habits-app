import { useAppSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { SEEN_FIRST_RUN_SETTING_KEY } from "../constants";
import {
	type FirstRunGate,
	firstRunGate,
	shouldMarkSeen,
} from "../domain/first-run-gate";
import { useHabitsList } from "../repositories/habit-repository";

export function useFirstRunQueries(): {
	gate: FirstRunGate;
	needsSeenMark: boolean;
	habitCount: number | undefined;
} {
	const seenFlag = useAppSetting(SEEN_FIRST_RUN_SETTING_KEY);
	const { habits, loaded } = useHabitsList();
	const state = { seenFlag, habitCount: loaded ? habits.length : undefined };
	return {
		gate: firstRunGate(state),
		needsSeenMark: shouldMarkSeen(state),
		habitCount: state.habitCount,
	};
}
