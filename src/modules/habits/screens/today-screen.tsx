import { addDays, format } from "date-fns";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { minTouchTarget, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { toDayKey } from "@/utils/day-key";
import { QuantityLogSheet } from "../components/quantity-log-sheet";
import { StreakAtRiskSheet } from "../components/streak-at-risk-sheet";
import { PastDayBar } from "../components/today/past-day-bar";
import { TodayDevButtons } from "../components/today/today-dev-buttons";
import { TodayEmptyState } from "../components/today/today-empty-state";
import { TodayHabitList } from "../components/today/today-habit-list";
import { TodayRestDay } from "../components/today/today-rest-day";
import { TodayHeader } from "../components/today-header";
import { WeekStrip } from "../components/week-strip";
import { useFirstRunQueries } from "../hooks/use-first-run-queries";
import { useOffScheduleQueries } from "../hooks/use-off-schedule-queries";
import { useSelectedDayQueries } from "../hooks/use-selected-day-queries";
import { useTodayDevActions } from "../hooks/use-today-dev-actions";
import { useTodayFreezeActions } from "../hooks/use-today-freeze-actions";
import { useTodayLogActions } from "../hooks/use-today-log-actions";
import { useTodayQueries } from "../hooks/use-today-queries";
import { useWeekStripQueries } from "../hooks/use-week-strip-queries";
import { todayCopy } from "../messages";
import { FirstRunScreen } from "./first-run-screen";

/**
 * No bottom edge: the floating pill carries its own 22 pt float over the home
 * indicator and every scroller pays `TAB_BAR_BOTTOM_PADDING`, so a bottom
 * safe-area inset here would stack a third gap on top of both (HAB-27).
 */
const SCREEN_EDGES = ["top", "left", "right"] as const;

/** How far (pt) the large title scrolls before the solid inline bar takes over (T5). */
const COLLAPSE_AT = space[800] + space[800];

/** Thin: reads from the hooks, picks the view state, hands props to the sections in `components/today/`. */
export function TodayScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const day = useSelectedDayQueries();
	const today = useTodayQueries(day.selectedKey);
	const strip = useWeekStripQueries(day.selectedDay, day.today);
	const { eligibleHabits, loggedToday } = useOffScheduleQueries(
		today.selectedDay,
	);
	const { hasSeenFirstRun } = useFirstRunQueries();
	const dev = useTodayDevActions();
	const [collapsed, setCollapsed] = useState(false);

	const dueHabits = today.groups.flatMap((group) => group.habits);
	const dueIds = new Set(dueHabits.map((habit) => habit.id));
	const notDueHabits = eligibleHabits.filter((habit) => !dueIds.has(habit.id));
	const loggedBonusIds = new Set(loggedToday.map(({ habit }) => habit.id));
	const logging = useTodayLogActions({
		today: today.today,
		selectedKey: day.selectedKey,
		completedHabitIds: today.completedHabitIds,
		quantityValuesByHabitId: today.quantityValuesByHabitId,
		loggableHabits: [...dueHabits, ...eligibleHabits],
	});
	const freeze = useTodayFreezeActions({
		habits: dueHabits,
		atRiskByHabitId: today.atRiskByHabitId,
	});

	const isToday = !day.isPastDay;
	const dayLabel = format(today.selectedDay, "EEE d MMM");
	const progressLabel = todayCopy.progressLabel(
		today.progress.completed,
		today.progress.total,
	);

	const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const next = event.nativeEvent.contentOffset.y > COLLAPSE_AT;
		if (next !== collapsed) setCollapsed(next);
	};

	const header = (
		<TodayHeader
			day={today.selectedDay}
			onAddHabit={() => router.push("/new-habit")}
			titleHidden={collapsed}
		/>
	);
	const weekStrip = (
		<WeekStrip
			days={strip.days}
			selectedKey={toDayKey(today.selectedDay)}
			selectedSummary={progressLabel}
			onSelect={day.selectDay}
			onStepDay={(step) => day.selectDay(addDays(today.selectedDay, step))}
			onPreviousWeek={strip.showPreviousWeek}
			onNextWeek={strip.showNextWeek}
			direction={strip.direction}
		/>
	);
	const openHabit = (habitId: number) => router.push(`/habit/${habitId}`);

	const quantitySheet = logging.quantitySheet ? (
		<QuantityLogSheet
			{...logging.quantitySheet}
			onClosed={logging.dismissQuantitySheet}
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

	return (
		<SafeAreaView
			edges={SCREEN_EDGES}
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<ScrollView
				contentContainerStyle={styles.content}
				onScroll={onScroll}
				scrollEventThrottle={16}
			>
				<View style={styles.top}>
					{header}
					{today.viewState === "no-habits" ? null : weekStrip}
				</View>
				{day.isPastDay ? (
					<PastDayBar dayLabel={dayLabel} onShowToday={day.showToday} />
				) : null}
				{today.viewState === "no-habits" ? (
					<TodayEmptyState
						onAddHabit={() => router.push("/new-habit")}
						dev={dev}
					/>
				) : today.viewState === "rest-day" ? (
					<TodayRestDay
						isToday={isToday}
						notDueHabits={notDueHabits}
						loggedToday={loggedToday}
						completedThisWeekByHabitId={today.completedThisWeekByHabitId}
						eligibleHabits={eligibleHabits}
						onOpenHabit={openHabit}
						onLogBonus={logging.logOffSchedule}
					/>
				) : (
					<TodayHabitList
						progress={today.progress}
						groups={today.groups}
						completedHabitIds={today.completedHabitIds}
						quantityValuesByHabitId={today.quantityValuesByHabitId}
						completedThisWeekByHabitId={today.completedThisWeekByHabitId}
						atRiskByHabitId={today.atRiskByHabitId}
						streakByHabitId={today.streakByHabitId}
						frozenYesterdayByHabitId={today.frozenYesterdayByHabitId}
						isToday={isToday}
						dayLabel={dayLabel}
						notDueHabits={notDueHabits}
						loggedBonusIds={loggedBonusIds}
						onToggle={logging.toggle}
						onAddOne={logging.addOne}
						onOpenQuantitySheet={logging.openQuantitySheet}
						onOpenHabit={openHabit}
						onOpenAtRisk={freeze.openAtRisk}
						onLogBonus={logging.logOffSchedule}
					/>
				)}
				{today.viewState === "populated" ? (
					<TodayDevButtons dev={dev} withClearAll />
				) : null}
			</ScrollView>
			{collapsed ? (
				<View
					testID="today-inline-bar"
					style={[
						styles.inlineBar,
						{ backgroundColor: colors.bg, borderBottomColor: colors.border },
					]}
				>
					<Text
						accessibilityElementsHidden
						importantForAccessibility="no-hide-descendants"
						style={[styles.inlineTitle, { color: colors.ink }]}
					>
						{todayCopy.screenTitle}
					</Text>
				</View>
			) : null}
			{quantitySheet}
			{freeze.atRiskInfo && freeze.atRiskHabit ? (
				<StreakAtRiskSheet
					visible
					habitName={freeze.atRiskHabit.name}
					currentStreak={freeze.atRiskInfo.currentStreak}
					freezesRemaining={freeze.atRiskInfo.freezesRemaining}
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
		paddingHorizontal: space[500],
		paddingTop: space[300],
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		gap: space[500],
	},
	/** Title and week strip read as one block (T1). */
	top: {
		gap: space[200],
	},
	/** T5: the large title has scrolled away; a solid bar keeps the screen named. */
	inlineBar: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: minTouchTarget,
		alignItems: "center",
		justifyContent: "center",
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	inlineTitle: {
		...textStyles.body,
		fontWeight: "500",
	},
});
