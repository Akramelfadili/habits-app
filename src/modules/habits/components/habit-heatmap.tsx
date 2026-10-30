import { format } from "date-fns";
import { StyleSheet, Text, View } from "react-native";
import type { CompletionCellState } from "@/components/ui/composite/completion-cell";
import { CompletionLegend } from "@/components/ui/composite/completion-legend";
import { CompletionRows } from "@/components/ui/composite/completion-rows";
import { Container } from "@/components/ui/composite/container";
import { Caption } from "@/components/ui/primitives/caption";
import { space, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { HeatmapDay } from "../domain/habit-history";
import { progressCopy } from "../messages";

type HabitHeatmapProps = {
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

/** The V3 mini-grid cell (D1): 24 pt. */
const HEATMAP_CELL = 24;

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

function cellStateFor(day: HeatmapDay): CompletionCellState {
	switch (day.status) {
		case "logged":
			return { kind: "level", level: day.level ?? 3 };
		case "bonus":
			return { kind: "bonus" };
		case "missed":
			return { kind: "level", level: 0 };
		case "frozen":
			return { kind: "frozen" };
		case "paused":
			return { kind: "paused" };
		case "reset":
			return { kind: "reset" };
		case "pending":
			return { kind: "nothing-logged" };
		case "future":
			return { kind: "future" };
		default:
			return { kind: "not-due" };
	}
}

/** Habit Detail's 10-week heatmap card (HAB-09) — rows are weekdays, columns are weeks. */
export function HabitHeatmap({
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
			<CompletionRows
				size={HEATMAP_CELL}
				gap={space[100]}
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
				<CompletionLegend
					entries={[]}
					scale={{
						less: progressCopy.legend.less,
						more: progressCopy.legend.more,
						frozenLabel: frozenLabel ?? progressCopy.legend.frozen,
					}}
				/>
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
