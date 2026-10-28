import { format } from "date-fns";
import { StyleSheet, View } from "react-native";
import { ChartCard } from "@/components/ui/composite/chart-card";
import { CompletionLegend } from "@/components/ui/composite/completion-legend";
import { MonthList } from "@/components/ui/composite/month-list";
import { UnlockCard } from "@/components/ui/composite/unlock-card";
import { YearHeatMap } from "@/components/ui/composite/year-heat-map";
import { Caption } from "@/components/ui/primitives/caption";
import { space } from "@/theme/theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { useScreenReader } from "@/utils/use-screen-reader";
import { useProgressYearQueries } from "../../hooks/use-progress-year-queries";
import { progressCopy } from "../../messages";
import {
	currentBandIndex,
	yearBandsProps,
	yearMonthListProps,
} from "../../presenters/progress-calendar-presenter";
import {
	insightProps,
	unlockProps,
	yearTiles,
} from "../../presenters/progress-presenter";
import type { Habit } from "../../types";
import { HabitFilterChip } from "./habit-filter-chip";
import { ProgressInsights } from "./progress-insights";
import { ProgressStatTiles } from "./progress-stat-tiles";
import { ProgressNoHabits, ProgressNothingLogged } from "./progress-states";

type ProgressYearProps = {
	/** The chip's habit, or null for all habits. */
	filtered: Habit | null;
	/** The one habit Progress is scoped to when only one exists; then there is nothing to filter. */
	oneHabit: Habit | null;
	today: Date;
	onOpenPicker: () => void;
	onOpenMonth: (month: Date) => void;
	onChangeFrequency: (habitId: number) => void;
	onAddHabit: () => void;
	onGoToToday: () => void;
};

/**
 * Progress · Year (HAB-37, P12, P14–P16): the year's heat map in three 4-month
 * bands — month labels the only taps — with the rate / streak / best-month
 * tiles, the best-month insight and a habit chip. VoiceOver and the large text
 * sizes get the month list instead of 365 small squares (P16).
 */
export function ProgressYear({
	filtered,
	oneHabit,
	today,
	onOpenPicker,
	onOpenMonth,
	onChangeFrequency,
	onAddHabit,
	onGoToToday,
}: ProgressYearProps) {
	const scoped = filtered ?? oneHabit;
	const view = useProgressYearQueries({ habitId: scoped?.id ?? null });
	const largeText = useAccessibilityTextSize();
	const screenReader = useScreenReader();

	if (view.state === "loading") return null;
	if (view.state === "no-habits") {
		return <ProgressNoHabits onAddHabit={onAddHabit} />;
	}

	const { grid } = view;
	const year = grid.year.start.getFullYear();
	const scope = scoped ? scoped.name : progressCopy.year.allHabits;
	const since = view.unlock.firstLogDate
		? progressCopy.year.since(format(view.unlock.firstLogDate, "d MMM"))
		: undefined;
	const asList = largeText || screenReader;
	const tooEarly = view.state === "too-early";
	const chip = oneHabit ? null : (
		<HabitFilterChip habit={filtered} onPress={onOpenPicker} />
	);

	const body = asList ? (
		<MonthList
			items={yearMonthListProps(grid, onOpenMonth)}
			emptyLabel={progressCopy.year.noData}
		/>
	) : (
		<YearHeatMap
			bands={yearBandsProps(grid, onOpenMonth)}
			onlyBand={tooEarly ? currentBandIndex(grid, today) : undefined}
		/>
	);
	const card = (
		<ChartCard
			testID="year-card"
			title={progressCopy.year.cardTitle(scope, year)}
			meta={since}
			footer={
				asList ? undefined : (
					<View style={styles.footer}>
						<CompletionLegend
							entries={[]}
							scale={{
								less: progressCopy.legend.less,
								more: progressCopy.legend.more,
								frozenLabel:
									view.state === "ready"
										? progressCopy.legend.freezesLeft(view.freezesLeft)
										: progressCopy.legend.frozen,
							}}
						/>
						<Caption>{progressCopy.year.rowsNote}</Caption>
					</View>
				)
			}
		>
			{body}
		</ChartCard>
	);

	if (view.state === "nothing-logged") {
		return (
			<>
				<ProgressNothingLogged
					range={progressCopy.ranges.year.toLowerCase()}
					onGoToToday={onGoToToday}
				/>
				{chip}
				{card}
			</>
		);
	}
	if (tooEarly) {
		return (
			<>
				<UnlockCard {...unlockProps("year", view.unlock)} />
				{chip}
				{card}
			</>
		);
	}
	if (view.state !== "ready") return null;

	const running = grid.months.find((month) => month.current);
	const best = grid.bestMonth;
	const insights = view.insights.map((insight) =>
		insightProps(insight, {
			kind: "year",
			previousWindowStart: view.summary.previousWindow.start,
			oneHabit: scoped,
			currentMonth:
				running && running.percent !== null
					? { month: running.month, percent: running.percent }
					: null,
		}),
	);

	return (
		<>
			<ProgressStatTiles
				tiles={yearTiles(
					view.summary,
					best ? { month: best.month, percent: best.percent } : null,
					{ today, oneHabit: scoped },
					view.unlock.firstLogDate,
				)}
			/>
			{insights.length > 0 ? (
				<ProgressInsights
					insights={insights}
					onChangeFrequency={onChangeFrequency}
				/>
			) : null}
			{chip}
			{card}
		</>
	);
}

const styles = StyleSheet.create({
	footer: {
		gap: space[150],
	},
});
