import { format, startOfDay } from "date-fns";
import { ChartCard } from "@/components/ui/composite/chart-card";
import {
	type ChartColumn,
	ColumnChart,
} from "@/components/ui/composite/column-chart";
import { KeyValueRow } from "@/components/ui/primitives/key-value-row";
import type { RangeSummary } from "../../domain/range-summary";
import { progressCopy } from "../../messages";

type WeekSummaryCardProps = {
	summary: RangeSummary;
	today: Date;
};

export function weekBarColumns(
	summary: RangeSummary,
	today: Date,
): ChartColumn[] {
	const start = startOfDay(today);
	return summary.weekdays.map((share) => {
		const date = share.date ?? start;
		const future = date > start;
		const percent = share.percent;
		const state: ChartColumn["state"] = future
			? "future"
			: date.getTime() === start.getTime()
				? "current"
				: "complete";
		const day = format(date, "EEEE");
		return {
			key: String(share.weekday),
			value: (percent ?? 0) / 100,
			state,
			label: format(date, "EEEEE"),
			valueLabel: percent === null ? undefined : `${percent}%`,
			accessibilityLabel: future
				? `${day}, ${progressCopy.cell.upcoming}`
				: percent === null
					? `${day}, ${progressCopy.cell.notDue}`
					: `${day}, ${progressCopy.cell.percent(percent)}`,
		};
	});
}

export function WeekSummaryCard({ summary, today }: WeekSummaryCardProps) {
	const columns = weekBarColumns(summary, today);
	const best = columns
		.filter((column) => column.state !== "future" && column.valueLabel)
		.sort((a, b) => b.value - a.value)[0];

	return (
		<ChartCard
			testID="week-summary-card"
			title={progressCopy.week.summaryTitle}
			meta={progressCopy.week.summaryMeta}
		>
			<ColumnChart
				columns={columns}
				summary={progressCopy.week.barSummary(best?.accessibilityLabel ?? null)}
			/>
			<KeyValueRow
				label={progressCopy.week.perfectDays}
				value={String(summary.perfectDays)}
			/>
			<KeyValueRow
				label={progressCopy.week.freezesUsed}
				value={String(summary.freezes.length)}
			/>
			<KeyValueRow
				label={progressCopy.week.bonusLogs}
				value={String(summary.bonus.length)}
			/>
		</ChartCard>
	);
}
