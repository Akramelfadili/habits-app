import { addDays, format } from "date-fns";
import { useRouter } from "expo-router";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	LinearTransition,
	ReduceMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	CollapsedHeaderBar,
	collapseRange,
	HEADER_BLOCK_GAP,
	HEADER_CONTENT_PADDING_TOP,
	useCollapsingHeader,
} from "@/components/ui/composite/collapsing-header";
import { HeaderCircleButton } from "@/components/ui/composite/header-buttons";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { motion, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { toDayKey } from "@/utils/day-key";
import { useReducedMotion } from "@/utils/use-reduced-motion";
import { FirstRunReminderOffer } from "../components/first-run/first-run-reminder-offer";
import { QuantityLogSheet } from "../components/quantity-log-sheet";
import { StreakAtRiskSheet } from "../components/streak-at-risk-sheet";
import { PastDayBar } from "../components/today/past-day-bar";
import { TodayDevButtons } from "../components/today/today-dev-buttons";
import { TodayEmptyState } from "../components/today/today-empty-state";
import { TodayHabitList } from "../components/today/today-habit-list";
import { TodayRestDay } from "../components/today/today-rest-day";
import { TodayHeader } from "../components/today-header";
import { WeekStrip } from "../components/week-strip";
import { EVENING_STARTS_AT_HOUR } from "../constants";
import { useOffScheduleQueries } from "../hooks/use-off-schedule-queries";
import { useSelectedDayQueries } from "../hooks/use-selected-day-queries";
import { useTodayDevActions } from "../hooks/use-today-dev-actions";
import { useTodayFreezeActions } from "../hooks/use-today-freeze-actions";
import { useTodayLogActions } from "../hooks/use-today-log-actions";
import { useTodayQueries } from "../hooks/use-today-queries";
import { useWeekStripQueries } from "../hooks/use-week-strip-queries";
import { todayCopy } from "../messages";

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
	const day = useSelectedDayQueries();
	const today = useTodayQueries(day.selectedKey);
	const strip = useWeekStripQueries(day.selectedDay, day.today);
	const { eligibleHabits, loggedToday } = useOffScheduleQueries(
		today.selectedDay,
	);
	const dev = useTodayDevActions();
	const header = useCollapsingHeader();
	const reduceMotion = useReducedMotion();
	// The "Logging for …" bar and the list under it move together over the
	// state timing (F-07); Reduce Motion crossfades the bar and lets the list
	// land at once. Without this the list jumped 64 pt when the bar mounted.
	const barEntering = FadeIn.duration(
		reduceMotion ? motion.state.reduced.crossfade : motion.state.duration,
	).reduceMotion(ReduceMotion.Never);
	const barExiting = FadeOut.duration(
		reduceMotion ? motion.state.reduced.crossfade : motion.state.duration,
	).reduceMotion(ReduceMotion.Never);
	const listLayout = reduceMotion
		? undefined
		: LinearTransition.duration(motion.state.duration).reduceMotion(
				ReduceMotion.Never,
			);

	const dueHabits = today.groups.flatMap((group) => group.habits);
	const dueIds = new Set(dueHabits.map((habit) => habit.id));
	const notDueHabits = eligibleHabits.filter((habit) => !dueIds.has(habit.id));
	const loggedBonusIds = new Set(loggedToday.map(({ habit }) => habit.id));
	const bonusValues = new Map(
		loggedToday.map(({ habit, entry }) => [habit.id, entry.value ?? 0]),
	);
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

	// The strip's top edge (content padding + header + the block's gap) is where
	// the bar's bottom edge has to end up, so the bar never covers the days.
	const onHeaderLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
		header.setRange(
			collapseRange(
				HEADER_CONTENT_PADDING_TOP +
					layout.y +
					layout.height +
					HEADER_BLOCK_GAP,
			),
		);

	const titleRow = (
		<View onLayout={onHeaderLayout}>
			<TodayHeader
				day={today.selectedDay}
				onAddHabit={() => router.push("/new-habit")}
				animatedStyle={header.titleStyle}
				collapsed={header.collapsed}
			/>
		</View>
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
			canShowNext={strip.canShowNext}
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

	return (
		<SafeAreaView
			edges={SCREEN_EDGES}
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<CollapsedHeaderBar
				testID="today-inline-bar"
				title={todayCopy.screenTitle}
				collapsed={header.collapsed}
				backgroundStyle={header.barBackgroundStyle}
				contentStyle={header.barContentStyle}
				trailing={
					<HeaderCircleButton
						symbol="plus"
						accessibilityLabel={todayCopy.addHabit}
						onPress={() => router.push("/new-habit")}
					/>
				}
			/>
			<Animated.ScrollView
				ref={header.scrollRef}
				testID="today-scroll"
				contentContainerStyle={styles.content}
				onScroll={header.onScroll}
				scrollEventThrottle={16}
			>
				<View style={styles.top}>
					{titleRow}
					{today.viewState === "no-habits" ? null : weekStrip}
				</View>
				{day.isPastDay ? (
					<Animated.View entering={barEntering} exiting={barExiting}>
						<PastDayBar dayLabel={dayLabel} onShowToday={day.showToday} />
					</Animated.View>
				) : null}
				<Animated.View layout={listLayout} style={styles.body}>
					{today.viewState === "no-habits" ? (
						<TodayEmptyState
							onAddHabit={() => router.push("/new-habit")}
							onBrowseSuggestions={() => router.push("/suggestions")}
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
							isEvening={new Date().getHours() >= EVENING_STARTS_AT_HOUR}
							dayLabel={dayLabel}
							notDueHabits={notDueHabits}
							loggedBonusIds={loggedBonusIds}
							bonusValues={bonusValues}
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
				</Animated.View>
			</Animated.ScrollView>
			{quantitySheet}
			<FirstRunReminderOffer />
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
		paddingTop: HEADER_CONTENT_PADDING_TOP,
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		gap: space[500],
	},
	/** The list and what follows it: one child, so one layout transition moves them. */
	body: {
		gap: space[500],
	},
	/** Title and week strip read as one block (T1). */
	top: {
		gap: HEADER_BLOCK_GAP,
	},
});
