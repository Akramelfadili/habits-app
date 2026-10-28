import { format, startOfWeek } from "date-fns";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	CollapsedHeaderBar,
	collapseRange,
	HEADER_CONTENT_PADDING_TOP,
	PinnedBelowBar,
	useCollapsingHeader,
} from "@/components/ui/composite/collapsing-header";
import { HeaderPillButton } from "@/components/ui/composite/header-buttons";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { SegmentedControl } from "@/components/ui/primitives/segmented-control";
import { habitAccentInk, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { EditDaySheet } from "../components/edit-day-sheet";
import { ExportSheet } from "../components/export-sheet";
import { HabitFilterSheet } from "../components/progress/habit-filter-sheet";
import { ProgressHeader } from "../components/progress/progress-header";
import { ProgressMonth } from "../components/progress/progress-month";
import { ProgressWeek } from "../components/progress/progress-week";
import { ProgressYear } from "../components/progress/progress-year";
import { useProgressFilterQueries } from "../hooks/use-progress-filter-queries";
import { useProgressShellQueries } from "../hooks/use-progress-shell-queries";
import { useProgressViewActions } from "../hooks/use-progress-view-actions";
import { useProgressViewQueries } from "../hooks/use-progress-view-queries";
import { useRetroLogQueries } from "../hooks/use-retro-log-queries";
import { messages, progressCopy, showMessage } from "../messages";
import type { ProgressRange } from "../progress-view-store";
import type { Habit } from "../types";

/**
 * No bottom edge: the floating pill carries its own float over the home
 * indicator and every scroller pays `TAB_BAR_BOTTOM_PADDING` (HAB-27).
 */
const SCREEN_EDGES = ["top", "left", "right"] as const;

/** The pinned switcher's track (48) and the breath under it (8), until it is measured. */
const SWITCHER_HEIGHT = 56;

/**
 * Progress (HAB-35–38, V3-3b): one tab root for Week, Month and Year. The large
 * title collapses into the inline bar, and the range switcher pins just under
 * it. Thin: it owns the sheets and the header, hands each range its props, and
 * lets the range's own hook decide which of too early / no habits / nothing
 * logged / ready it is showing.
 */
export function ProgressScreen() {
	const router = useRouter();
	const { colors, scheme } = useTheme();
	const shell = useProgressShellQueries();
	const view = useProgressViewQueries();
	const actions = useProgressViewActions();
	const filter = useProgressFilterQueries();
	const header = useCollapsingHeader();
	const switcherTop = useSharedValue(0);
	const [switcherHeight, setSwitcherHeight] = useState(SWITCHER_HEIGHT);
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [editDate, setEditDate] = useState<Date | null>(null);
	const editDay = useRetroLogQueries(null, editDate);

	const dot = useCallback(
		(habit: Habit) => habitAccentInk(habit.category.hue, scheme),
		[scheme],
	);
	const oneHabit = filter.onlyHabit;
	const filtered =
		view.habitId === null
			? null
			: ([...filter.active, ...filter.archived].find(
					(habit) => habit.id === view.habitId,
				) ?? null);

	const exportUnavailable = !shell.hasHabits || !shell.hasLogs;
	const onExport = () => {
		if (exportUnavailable) showMessage(messages.exportNothing, []);
		else setExportOpen(true);
	};
	const onAddHabit = () => router.push("/new-habit");
	const onGoToToday = () => router.navigate("/");
	const onChangeFrequency = (habitId: number) =>
		router.push(`/edit-habit/${habitId}?focus=frequency`);

	const eyebrow =
		view.range === "week"
			? progressCopy.eyebrow.week(
					format(startOfWeek(shell.today, { weekStartsOn: 1 }), "d MMMM"),
				)
			: view.range === "month"
				? format(view.month ?? shell.today, "MMMM yyyy")
				: String(shell.today.getFullYear());

	// Where the switcher's slot starts is where the bar's bottom edge must end up, so the bar never covers it.
	const onSlotLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
		switcherTop.value = layout.y;
		header.setRange(collapseRange(layout.y));
	};

	if (!shell.loaded) {
		return (
			<SafeAreaView
				edges={SCREEN_EDGES}
				testID="screen-loading"
				style={[styles.screen, { backgroundColor: colors.bg }]}
			/>
		);
	}

	const exportButton = (
		<HeaderPillButton
			label={progressCopy.export}
			symbol="square.and.arrow.up"
			accessibilityLabel={progressCopy.exportLabel}
			unavailable={exportUnavailable}
			onPress={onExport}
		/>
	);

	return (
		<SafeAreaView
			edges={SCREEN_EDGES}
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<CollapsedHeaderBar
				testID="progress-inline-bar"
				title={progressCopy.screenTitle}
				collapsed={header.collapsed}
				backgroundStyle={header.barBackgroundStyle}
				contentStyle={header.barContentStyle}
				trailing={exportButton}
			/>
			<PinnedBelowBar
				testID="progress-range-bar"
				scrollY={header.scrollY}
				top={switcherTop}
				onHeight={(height) => {
					// An opened AX list grows the layer, not its slot in the content.
					if (!switcherOpen) setSwitcherHeight(height);
				}}
			>
				<SegmentedControl
					label={progressCopy.rangeLabel}
					axLayout="collapse"
					collapsedHint={progressCopy.rangeHint}
					onOpenChange={setSwitcherOpen}
					options={[
						{ value: "week", label: progressCopy.ranges.week },
						{ value: "month", label: progressCopy.ranges.month },
						{ value: "year", label: progressCopy.ranges.year },
					]}
					value={view.range}
					onChange={(range: ProgressRange) => actions.setRange(range)}
				/>
			</PinnedBelowBar>
			<Animated.ScrollView
				ref={header.scrollRef}
				testID="progress-scroll"
				contentContainerStyle={styles.content}
				onScroll={header.onScroll}
				scrollEventThrottle={16}
			>
				<ProgressHeader
					eyebrow={eyebrow}
					exportUnavailable={exportUnavailable}
					onExport={onExport}
					back={
						view.range === "month" && view.fromYear
							? {
									label: progressCopy.backToYear,
									onPress: actions.backToYear,
								}
							: undefined
					}
					animatedStyle={header.titleStyle}
					collapsed={header.collapsed}
				/>
				<View
					testID="progress-switcher-slot"
					onLayout={onSlotLayout}
					style={{ height: switcherHeight - space[200] }}
				/>
				{view.range === "week" ? (
					<ProgressWeek
						oneHabit={oneHabit}
						dot={dot}
						today={shell.today}
						onEditDay={setEditDate}
						onChangeFrequency={onChangeFrequency}
						onAddHabit={onAddHabit}
						onGoToToday={onGoToToday}
					/>
				) : view.range === "month" ? (
					<ProgressMonth
						oneHabit={oneHabit}
						month={view.month}
						selectedKey={view.selectedKey}
						selectedDay={view.selectedDay}
						dot={dot}
						today={shell.today}
						onSelectDay={actions.selectDay}
						onEditDay={setEditDate}
						onChangeFrequency={onChangeFrequency}
						onAddHabit={onAddHabit}
						onGoToToday={onGoToToday}
					/>
				) : (
					<ProgressYear
						filtered={filtered}
						oneHabit={oneHabit}
						today={shell.today}
						onOpenPicker={() => setPickerOpen(true)}
						onOpenMonth={actions.openMonthFromYear}
						onChangeFrequency={onChangeFrequency}
						onAddHabit={onAddHabit}
						onGoToToday={onGoToToday}
					/>
				)}
			</Animated.ScrollView>
			<HabitFilterSheet
				visible={pickerOpen}
				active={filter.active}
				archived={filter.archived}
				selectedId={view.habitId}
				onSelect={(habitId) => {
					actions.setHabit(habitId);
					setPickerOpen(false);
				}}
				onDismiss={() => setPickerOpen(false)}
			/>
			<ExportSheet visible={exportOpen} onClose={() => setExportOpen(false)} />
			<EditDaySheet day={editDay} onDismiss={() => setEditDate(null)} />
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
		gap: space[300],
	},
});
