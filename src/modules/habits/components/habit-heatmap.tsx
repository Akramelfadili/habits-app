import { format } from "date-fns";
import { StyleSheet, Text, View } from "react-native";
import { CompletionGrid } from "@/components/ui/composite/completion-grid";
import { Container } from "@/components/ui/composite/container";
import type { HeatmapCellState } from "@/components/ui/composite/heatmap-cell";
import { HeatmapLegend } from "@/components/ui/composite/heatmap-legend";
import { Caption } from "@/components/ui/primitives/caption";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { HeatmapDay } from "../domain/habit-history";
import type { Habit } from "../types";

type HabitHeatmapProps = {
	habit: Habit;
	/** Week columns, oldest first, each Monday → Sunday. */
	weeks: HeatmapDay[][];
	/** Nothing logged yet — swaps the range and legend for first-run copy. */
	hasEntries: boolean;
	/** The range line's text — "Jul — Sep · ended 2 Sep" while archived, "· paused 2 · 15 Sep" once restored (HAB-20). */
	rangeLabel: string;
	/** The legend's frozen swatch text — "2 freezes left" (HAB-20); omitted while archived, so plain "Frozen". */
	frozenLabel?: string;
	/** A past (or today's) cell was tapped — the entry point into retro logging (HAB-10). */
	onSelectDay: (date: Date) => void;
};

const STATUS_LABEL: Record<HeatmapDay["status"], string> = {
	"not-scheduled": "not scheduled",
	missed: "missed",
	frozen: "frozen",
	logged: "logged",
	bonus: "logged off-schedule",
	paused: "paused",
	reset: "missed, streak reset",
	pending: "not logged yet",
	future: "upcoming",
};

function cellStateFor(day: HeatmapDay): HeatmapCellState {
	switch (day.status) {
		case "logged":
			return { kind: "level", level: day.level ?? 3 };
		case "bonus":
			return { kind: "bonus" };
		case "missed":
			return { kind: "missed" };
		case "frozen":
			return { kind: "frozen" };
		case "paused":
			return { kind: "paused" };
		case "reset":
			return { kind: "reset" };
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
	hasEntries,
	rangeLabel,
	frozenLabel,
	onSelectDay,
}: HabitHeatmapProps) {
	const { colors } = useTheme();
	const weekdayRows = Array.from({ length: 7 }, (_, weekday) =>
		weeks.map((week) => week[weekday]),
	);

	return (
		<Container>
			<View style={styles.header}>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					Last 10 weeks
				</Text>
				<Text style={[styles.range, { color: colors.sub }]}>
					{hasEntries ? rangeLabel : "Nothing logged yet"}
				</Text>
			</View>
			<CompletionGrid
				layout="detail"
				accent={habit.category.hue}
				rows={weekdayRows.map((row) =>
					row.map((day) => ({
						key: day.date.toISOString(),
						state: cellStateFor(day),
						accessibilityLabel: `${format(day.date, "EEEE d MMMM")}, ${STATUS_LABEL[day.status]}`,
						onPress: day.selectable ? () => onSelectDay(day.date) : undefined,
					})),
				)}
			/>
			{hasEntries ? (
				<HeatmapLegend accent={habit.category.hue} frozenLabel={frozenLabel} />
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
});
