import { Alert } from "react-native";
import { useFirstRunActions } from "./use-first-run-actions";
import { useHabitActions } from "./use-habit-actions";

/**
 * The dev-only Today buttons (seed, clear, reset First Run). Every action is
 * `undefined` outside `__DEV__`, so a section renders a button only when its
 * action exists. Destructive ones confirm first.
 */
export function useTodayDevActions() {
	const {
		clearAllHabits,
		isClearingAll,
		seedStreakAtRiskHabit,
		isSeedingStreakAtRisk,
		seedHabitWithHistory,
		isSeedingHistory,
	} = useHabitActions();
	const { resetFirstRun, isResetting } = useFirstRunActions();

	function confirmClearAll() {
		if (!clearAllHabits) return;
		Alert.alert(
			"Clear all habits?",
			"Dev-only: deletes every habit in the local database. This can't be undone.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear",
					style: "destructive",
					onPress: () => clearAllHabits(),
				},
			],
		);
	}

	function confirmResetFirstRun() {
		if (!resetFirstRun) return;
		Alert.alert(
			"Reset First Run?",
			"Dev-only: deletes every habit and un-sets the “seen first run” flag, so First Run shows again.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Reset",
					style: "destructive",
					onPress: () => resetFirstRun(),
				},
			],
		);
	}

	return {
		clearAll: clearAllHabits ? confirmClearAll : undefined,
		isClearingAll,
		seedStreakAtRisk: seedStreakAtRiskHabit,
		isSeedingStreakAtRisk,
		seedHistory: seedHabitWithHistory,
		isSeedingHistory,
		resetFirstRun: resetFirstRun ? confirmResetFirstRun : undefined,
		isResetting,
	};
}
