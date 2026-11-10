import { startOfDay } from "date-fns";
import { StyleSheet, View } from "react-native";
import { ChartCard } from "@/components/ui/composite/chart-card";
import { CompletionLegend } from "@/components/ui/composite/completion-legend";
import { UnlockCard } from "@/components/ui/composite/unlock-card";
import { WeekBlocks, WeekMatrix } from "@/components/ui/composite/week-matrix";
import { Caption } from "@/components/ui/primitives/caption";
import { space } from "@/theme/theme";
import { formatDateRange } from "@/utils/format";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { useProgressWeekQueries } from "../../hooks/use-progress-week-queries";
import { progressCopy } from "../../messages";
import {
	type DotColor,
	insightProps,
	oneHabitSubline,
	unlockProps,
	weekBlocksProps,
	weekLegend,
	weekMatrixProps,
	weekStartedNote,
	weekTiles,
} from "../../presenters/progress-presenter";
import type { Habit } from "../../types";
import { HabitBadge } from "../habit-badge";
import { ProgressInsights } from "./progress-insights";
import { ProgressStatTiles } from "./progress-stat-tiles";
import { ProgressNoHabits, ProgressNothingLogged } from "./progress-states";
import { WeekSummaryCard } from "./week-summary-card";

type ProgressWeekProps = {
	oneHabit: Habit | null;
	dot: DotColor;
	today: Date;
	onEditDay: (date: Date) => void;
	onChangeFrequency: (habitId: number) => void;
	onAddHabit: () => void;
	onGoToToday: () => void;
};

export function ProgressWeek({
	oneHabit,
	dot,
	today,
	onEditDay,
	onChangeFrequency,
	onAddHabit,
	onGoToToday,
}: ProgressWeekProps) {
	const view = useProgressWeekQueries({ habitId: oneHabit?.id ?? null });
	const largeText = useAccessibilityTextSize();

	if (view.state === "loading") return null;
	if (view.state === "no-habits") {
		return <ProgressNoHabits onAddHabit={onAddHabit} />;
	}

	const { grid } = view;
	const asBlocks = largeText || oneHabit !== null;
	const matrix = asBlocks ? (
		<WeekBlocks
			blocks={weekBlocksProps(grid, dot, onEditDay, today).map((block) =>
				oneHabit
					? {
							...block,
							leading: <HabitBadge habit={oneHabit} />,
							subline: oneHabitSubline(oneHabit),
						}
					: block,
			)}
		/>
	) : (
		<WeekMatrix {...weekMatrixProps(grid, dot, onEditDay, today)} />
	);
	const note =
		view.state === "nothing-logged"
			? progressCopy.week.outlinedNote
			: view.state === "too-early"
				? weekStartedNote(grid, view.unlock)
				: null;
	const body = oneHabit ? (
		<ChartCard testID="week-card">{matrix}</ChartCard>
	) : (
		<ChartCard
			testID="week-card"
			title={progressCopy.week.cardTitle}
			meta={formatDateRange(grid.week.start, grid.week.end)}
			footer={
				<View style={styles.footer}>
					<CompletionLegend entries={weekLegend()} />
					{note ? <Caption>{note}</Caption> : null}
				</View>
			}
		>
			{matrix}
		</ChartCard>
	);

	if (view.state === "nothing-logged") {
		return (
			<>
				<ProgressNothingLogged
					range={progressCopy.ranges.week.toLowerCase()}
					onGoToToday={onGoToToday}
				/>
				{body}
			</>
		);
	}

	if (view.state === "too-early") {
		return (
			<>
				<UnlockCard {...unlockProps("week", view.unlock)} />
				{body}
			</>
		);
	}

	const context = {
		today: startOfDay(today),
		oneHabit,
	};
	const insights = view.insights.map((insight) =>
		insightProps(insight, {
			kind: "week",
			previousWindowStart: view.summary.previousWindow.start,
			oneHabit,
			currentMonth: null,
		}),
	);

	return (
		<>
			<ProgressStatTiles
				tiles={weekTiles(view.summary, context, view.freezesLeft)}
			/>
			{insights.length > 0 ? (
				<ProgressInsights
					insights={insights}
					onChangeFrequency={onChangeFrequency}
				/>
			) : null}
			{body}
			{oneHabit ? null : (
				<WeekSummaryCard summary={view.summary} today={context.today} />
			)}
		</>
	);
}

const styles = StyleSheet.create({
	footer: {
		gap: space[150],
	},
});
