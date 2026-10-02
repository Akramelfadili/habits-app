import { format } from "date-fns";
import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import {
	HeatmapCell,
	type HeatmapCellState,
} from "@/components/ui/composite/heatmap-cell";
import { HeatmapLegend } from "@/components/ui/composite/heatmap-legend";
import { Caption } from "@/components/ui/primitives/caption";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { heatmapRangeLabel } from "../screens/habit-detail-helpers";
import type { HeatmapDay } from "../services/habit-history";
import type { Habit } from "../types";

type HabitHeatmapProps = {
	habit: Habit;
	/** Week columns, oldest first, each Monday → Sunday. */
	weeks: HeatmapDay[][];
	today: Date;
	/** Nothing logged yet — swaps the range and legend for first-run copy. */
	hasEntries: boolean;
	/** A past (or today's) cell was tapped — the entry point into retro logging (HAB-10). */
	onSelectDay: (date: Date) => void;
};

const STATUS_LABEL: Record<HeatmapDay["status"], string> = {
	"not-scheduled": "not scheduled",
	missed: "missed",
	frozen: "frozen",
	logged: "logged",
	pending: "not logged yet",
	future: "upcoming",
};

function cellStateFor(day: HeatmapDay): HeatmapCellState {
	switch (day.status) {
		case "logged":
			return { kind: "level", level: day.level ?? 3 };
		case "missed":
			return { kind: "missed" };
		case "frozen":
			return { kind: "frozen" };
		default:
			// Pending today and future days can't have been missed yet — they
			// read as blank, same as a day that was never scheduled.
			return { kind: "not-scheduled" };
	}
}

/** Habit Detail's 10-week heatmap card (HAB-09) — rows are weekdays, columns are weeks. */
export function HabitHeatmap({
	habit,
	weeks,
	today,
	hasEntries,
	onSelectDay,
}: HabitHeatmapProps) {
	const { colors } = useTheme();
	const firstDay = weeks[0]?.[0]?.date ?? today;
	const weekdayRows = Array.from({ length: 7 }, (_, weekday) =>
		weeks.map((week) => week[weekday]),
	);

	return (
		<Container>
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.ink }]}>Last 10 weeks</Text>
				<Text style={[styles.range, { color: colors.sub }]}>
					{hasEntries
						? heatmapRangeLabel(firstDay, today)
						: "Nothing logged yet"}
				</Text>
			</View>
			<View style={styles.grid}>
				{weekdayRows.map((row, weekday) => (
					<View
						// biome-ignore lint/suspicious/noArrayIndexKey: rows are the fixed Mon→Sun order
						key={weekday}
						style={styles.row}
					>
						{row.map((day) => (
							<HeatmapCell
								key={day.date.toISOString()}
								state={cellStateFor(day)}
								accent={habit.category.hue}
								accessibilityLabel={`${format(day.date, "EEEE d MMMM")}, ${STATUS_LABEL[day.status]}`}
								onPress={
									day.selectable ? () => onSelectDay(day.date) : undefined
								}
							/>
						))}
					</View>
				))}
			</View>
			{hasEntries ? (
				<HeatmapLegend accent={habit.category.hue} />
			) : (
				<Caption>Cells fill in as you log — the first one is today.</Caption>
			)}
		</Container>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "baseline",
	},
	title: {
		fontSize: typeScale.rowLabel,
		fontWeight: "500",
	},
	range: {
		fontSize: typeScale.caption,
	},
	grid: {
		gap: 5,
	},
	row: {
		flexDirection: "row",
		gap: 5,
	},
});
