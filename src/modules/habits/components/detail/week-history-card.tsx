import { Pressable, StyleSheet, Text, View } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import type { LegendEntry } from "@/components/ui/composite/completion-legend";
import { CompletionLegend } from "@/components/ui/composite/completion-legend";
import { CompletionRows } from "@/components/ui/composite/completion-rows";
import { Container } from "@/components/ui/composite/container";
import { minTouchTarget, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { detailCopy } from "../../messages";
import type { WeekRow } from "../../presenters/habit-detail-presenter";

const CELL = 24;

/** M T W T F S S: the column heads, Monday first (weeks start Monday). */
const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

type WeekHistoryCardProps = {
	rangeLabel: string;
	rows: readonly WeekRow[];
	legend: readonly LegendEntry[];
	/** "Streak reset on Wed 14 Oct — no freezes were left." Only in the month it happened. */
	notice: string | null;
	/** A week row was tapped: open Edit this day for that date. */
	onEditDay: (date: Date) => void;
};

/**
 * The "Last 5 weeks" card: five rows of seven 24 pt cells under Monday-first column heads. Each
 * week row is ONE 44 pt target that opens Edit this day, and one VoiceOver stop that reads the whole
 * week ("Week of 19 October: Monday bonus, Tuesday done…"); the cells are decorative. A week with
 * nothing to edit is plain, not a button.
 */
export function WeekHistoryCard({
	rangeLabel,
	rows,
	legend,
	notice,
	onEditDay,
}: WeekHistoryCardProps) {
	const { colors } = useTheme();

	return (
		<Container variant="summary">
			<View style={styles.header}>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					{detailCopy.grid.title}
				</Text>
				<Text style={[styles.range, { color: colors.sub }]}>{rangeLabel}</Text>
			</View>
			<View
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				style={styles.heads}
			>
				{WEEKDAY_LETTERS.map((letter, index) => (
					<Text
						// biome-ignore lint/suspicious/noArrayIndexKey: seven fixed weekday heads
						key={index}
						style={[styles.head, { color: colors.sub }]}
					>
						{letter}
					</Text>
				))}
			</View>
			<View>
				{rows.map((row) => (
					<WeekRowTarget key={row.key} row={row} onEditDay={onEditDay} />
				))}
			</View>
			{legend.length > 0 ? <CompletionLegend entries={[...legend]} /> : null}
			{notice ? <Banner tone="notice">{notice}</Banner> : null}
		</Container>
	);
}

function WeekRowTarget({
	row,
	onEditDay,
}: {
	row: WeekRow;
	onEditDay: (date: Date) => void;
}) {
	const { opacity } = useTheme();
	const grid = (
		<CompletionRows
			testID={`week-row-${row.key}`}
			rows={[row.cells]}
			size={CELL}
			spread
		/>
	);
	const target = row.targetDate;
	if (!target) {
		return (
			<View accessible accessibilityLabel={row.label} style={styles.week}>
				{grid}
			</View>
		);
	}
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={row.label}
			accessibilityHint={detailCopy.grid.weekHint}
			onPress={() => onEditDay(target)}
			style={({ pressed }) => [
				styles.week,
				pressed && { opacity: opacity.pressed },
			]}
		>
			{grid}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: space[300],
	},
	title: {
		...textStyles.callout,
		fontWeight: "500",
	},
	range: {
		...textStyles.footnote,
		flexShrink: 1,
	},
	heads: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	head: {
		...textStyles.caption,
		width: CELL,
		textAlign: "center",
	},
	week: {
		minHeight: minTouchTarget,
		justifyContent: "center",
	},
});
