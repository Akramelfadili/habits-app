import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { useTheme } from "@/theme/use-theme";
import { QuantityLogSheet } from "../components/quantity-log-sheet";
import { StreakAtRiskSheet } from "../components/streak-at-risk-sheet";
import { TodayDayClosed } from "../components/today/today-day-closed";
import { TodayDevButtons } from "../components/today/today-dev-buttons";
import { TodayEmptyState } from "../components/today/today-empty-state";
import { TodayHabitList } from "../components/today/today-habit-list";
import { TodayRestDay } from "../components/today/today-rest-day";
import { TodayHeader } from "../components/today-header";
import { useFirstRunQueries } from "../hooks/use-first-run-queries";
import { useOffScheduleQueries } from "../hooks/use-off-schedule-queries";
import { useSelectedDayQueries } from "../hooks/use-selected-day-queries";
import { useTodayDevActions } from "../hooks/use-today-dev-actions";
import { useTodayFreezeActions } from "../hooks/use-today-freeze-actions";
import { useTodayLogActions } from "../hooks/use-today-log-actions";
import { useTodayQueries } from "../hooks/use-today-queries";
import { FirstRunScreen } from "./first-run-screen";

/**
 * No bottom edge: the floating pill carries its own 22 pt float over the home
 * indicator and every scroller pays `TAB_BAR_BOTTOM_PADDING`, so a bottom
 * safe-area inset here would stack a third gap on top of both (HAB-27).
 */
const SCREEN_EDGES = ["top", "left", "right"] as const;

/** Thin: reads from the hooks, picks the view state, hands props to the sections in `components/today/`. */
export function TodayScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const { selectedKey } = useSelectedDayQueries();
	const today = useTodayQueries(selectedKey);
	const { eligibleHabits, loggedToday } = useOffScheduleQueries(
		today.selectedDay,
	);
	const { hasSeenFirstRun } = useFirstRunQueries();
	const dev = useTodayDevActions();

	const dueHabits = today.groups.flatMap((group) => group.habits);
	const logging = useTodayLogActions({
		today: today.today,
		selectedKey,
		completedHabitIds: today.completedHabitIds,
		quantityValuesByHabitId: today.quantityValuesByHabitId,
		loggableHabits: [...dueHabits, ...eligibleHabits],
	});
	const freeze = useTodayFreezeActions({
		habits: dueHabits,
		atRiskByHabitId: today.atRiskByHabitId,
	});

	const header = (
		<TodayHeader
			today={today.today}
			onAddHabit={() => router.push("/new-habit")}
		/>
	);
	const openHabit = (habitId: number) => router.push(`/habit/${habitId}`);

	const quantitySheet = logging.quantityHabit ? (
		<QuantityLogSheet
			visible
			habit={logging.quantityHabit}
			value={logging.quantityValue}
			onDismiss={logging.dismissQuantitySheet}
			onSave={logging.saveQuantity}
			isSaving={logging.isLogging}
		/>
	) : null;

	// Habits haven't loaded yet: a neutral blank, never a flash of "Nothing to
	// track yet" or First Run (audit A5-04).
	if (!today.isLoaded) {
		return (
			<SafeAreaView
				edges={SCREEN_EDGES}
				testID="screen-loading"
				style={[styles.screen, { backgroundColor: colors.bg }]}
			/>
		);
	}

	if (today.viewState === "no-habits" && !hasSeenFirstRun) {
		return <FirstRunScreen />;
	}

	if (today.viewState === "no-habits" || today.viewState === "rest-day") {
		return (
			<SafeAreaView
				edges={SCREEN_EDGES}
				style={[
					styles.screen,
					styles.panelScreen,
					{ backgroundColor: colors.bg },
				]}
			>
				<View style={styles.headerPadding}>{header}</View>
				{today.viewState === "no-habits" ? (
					<TodayEmptyState
						onAddHabit={() => router.push("/new-habit")}
						dev={dev}
					/>
				) : (
					<TodayRestDay
						today={today.selectedDay}
						eligibleHabits={eligibleHabits}
						loggedToday={loggedToday}
						onOpenHabit={openHabit}
						onPickHabit={logging.logOffSchedule}
					/>
				)}
				{today.viewState === "rest-day" ? quantitySheet : null}
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView
			edges={SCREEN_EDGES}
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<ScrollView contentContainerStyle={styles.content}>
				{header}
				{today.viewState === "day-closed" ? (
					<TodayDayClosed
						total={today.progress.total}
						tomorrowPreview={today.tomorrowPreview}
						tomorrowReminderTimeByHabitId={today.tomorrowReminderTimeByHabitId}
					/>
				) : (
					<>
						<TodayHabitList
							progress={today.progress}
							groups={today.groups}
							completedHabitIds={today.completedHabitIds}
							quantityValuesByHabitId={today.quantityValuesByHabitId}
							completedThisWeekByHabitId={today.completedThisWeekByHabitId}
							atRiskByHabitId={today.atRiskByHabitId}
							onToggle={logging.toggle}
							onAddOne={logging.addOne}
							onOpenQuantitySheet={logging.openQuantitySheet}
							onOpenHabit={openHabit}
							onOpenAtRisk={freeze.openAtRisk}
						/>
						<TodayDevButtons dev={dev} withClearAll />
					</>
				)}
			</ScrollView>
			{today.viewState === "day-closed" ? null : quantitySheet}
			{freeze.atRiskInfo && freeze.atRiskHabit ? (
				<StreakAtRiskSheet
					visible
					habitName={freeze.atRiskHabit.name}
					currentStreak={freeze.atRiskInfo.currentStreak}
					freezesRemaining={today.freezesRemainingThisMonth}
					today={today.today}
					onUseFreeze={freeze.spendFreeze}
					onNotNow={freeze.dismissAtRisk}
					isApplyingFreeze={freeze.isFreezing}
				/>
			) : null}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		gap: 16,
	},
	/** The states that show a panel instead of a list still clear the pill. */
	panelScreen: {
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
	},
	headerPadding: {
		paddingHorizontal: 16,
		paddingTop: 12,
	},
});
