import { format } from "date-fns";
import { StyleSheet, View } from "react-native";
import { ChartCard } from "@/components/ui/composite/chart-card";
import { CompletionLegend } from "@/components/ui/composite/completion-legend";
import { MonthCalendar } from "@/components/ui/composite/month-calendar";
import { UnlockCard } from "@/components/ui/composite/unlock-card";
import { Caption } from "@/components/ui/primitives/caption";
import { space } from "@/theme/theme";
import { useDayDetailQueries } from "../../hooks/use-day-detail-queries";
import { useProgressMonthQueries } from "../../hooks/use-progress-month-queries";
import { progressCopy } from "../../messages";
import {
	dayDetailProps,
	monthCalendarProps,
	monthNote,
	monthRateRows,
} from "../../presenters/progress-calendar-presenter";
import {
	type DotColor,
	insightProps,
	monthTiles,
	unlockProps,
} from "../../presenters/progress-presenter";
import type { Habit } from "../../types";
import { DayDetailCard } from "./day-detail-card";
import { MonthRatesCard } from "./month-rates-card";
import { ProgressInsights } from "./progress-insights";
import { ProgressStatTiles } from "./progress-stat-tiles";
import { ProgressNoHabits, ProgressNothingLogged } from "./progress-states";

type ProgressMonthProps = {
	oneHabit: Habit | null;
	month: Date | null;
	selectedKey: string | null;
	selectedDay: Date | null;
	dot: DotColor;
	today: Date;
	onSelectDay: (day: Date | null) => void;
	onEditDay: (date: Date) => void;
	onChangeFrequency: (habitId: number) => void;
	onAddHabit: () => void;
	onGoToToday: () => void;
};

export function ProgressMonth({
	oneHabit,
	month,
	selectedKey,
	selectedDay,
	dot,
	today,
	onSelectDay,
	onEditDay,
	onChangeFrequency,
	onAddHabit,
	onGoToToday,
}: ProgressMonthProps) {
	const view = useProgressMonthQueries({
		habitId: oneHabit?.id ?? null,
		month,
	});
	const day = useDayDetailQueries(selectedDay, oneHabit?.id ?? null);

	if (view.state === "loading") return null;
	if (view.state === "no-habits") {
		return <ProgressNoHabits onAddHabit={onAddHabit} />;
	}

	const { grid } = view;
	const tooEarly = view.state === "too-early";
	const calendar = monthCalendarProps(grid, selectedKey, (picked) =>
		onSelectDay(selectedKey === picked.key ? null : picked.date),
	);
	const note = monthNote(grid, {
		unlock: view.unlock,
		oneHabit,
		tooEarly,
	});
	const monthName = format(grid.month.start, "MMMM");
	const detail =
		selectedDay && day.loaded ? dayDetailProps(day.detail, dot) : null;

	const calendarCard = (
		<ChartCard
			testID="month-card"
			title={monthName}
			meta={progressCopy.month.cardMeta}
			footer={
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
					{note ? <Caption>{note}</Caption> : null}
				</View>
			}
		>
			<MonthCalendar {...calendar} />
		</ChartCard>
	);
	const detailCard = detail ? (
		<DayDetailCard
			detail={detail}
			onClose={() => onSelectDay(null)}
			onEdit={() => selectedDay && onEditDay(selectedDay)}
		/>
	) : null;

	if (view.state === "nothing-logged") {
		return (
			<>
				<ProgressNothingLogged
					range={progressCopy.ranges.month.toLowerCase()}
					onGoToToday={onGoToToday}
				/>
				{calendarCard}
				{detailCard}
			</>
		);
	}
	if (tooEarly) {
		return (
			<>
				<UnlockCard {...unlockProps("month", view.unlock)} />
				{calendarCard}
				{detailCard}
			</>
		);
	}
	if (view.state !== "ready") return null;

	const { summary } = view;
	const insights = view.insights.map((insight) =>
		insightProps(insight, {
			kind: "month",
			previousWindowStart: summary.previousWindow.start,
			oneHabit,
			currentMonth: null,
		}),
	);
	const rows = monthRateRows(summary.habits, dot);
	const isCurrentMonth = grid.month.end >= today;

	return (
		<>
			<ProgressStatTiles tiles={monthTiles(summary, { today, oneHabit })} />
			{insights.length > 0 ? (
				<ProgressInsights
					insights={insights}
					onChangeFrequency={onChangeFrequency}
				/>
			) : null}
			{calendarCard}
			{detailCard}
			{oneHabit ? null : (
				<MonthRatesCard
					rows={rows}
					meta={isCurrentMonth ? `${monthName} so far` : monthName}
				/>
			)}
		</>
	);
}

const styles = StyleSheet.create({
	footer: {
		gap: space[150],
	},
});
