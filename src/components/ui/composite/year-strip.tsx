import { StyleSheet, Text, View } from "react-native";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { CompletionCell, type CompletionCellState } from "./completion-cell";

/** V3-06's compact year strip (T-10): twelve 24 pt month cells. */
export const YEAR_STRIP_CELL = 24;

export type YearStripMonth = {
	key: string;
	/** The month's rate as a cell: a level, dashed before the first log, a hairline ahead. */
	state: CompletionCellState;
	/** "J", "F", … */
	initial: string;
	/** The month still running: ringed, its initial in ink. */
	current?: boolean;
};

type YearStripProps = {
	months: YearStripMonth[];
	/** One summary for VoiceOver ("Meditate, 2026, best month September 100 percent"): the strip is a single stop. */
	accessibilityLabel: string;
};

/** V3-06 · compact year strip: a habit's twelve months in one short row, initials underneath. */
export function YearStrip({ months, accessibilityLabel }: YearStripProps) {
	const { colors } = useTheme();

	return (
		<View
			testID="year-strip"
			accessible
			accessibilityRole="image"
			accessibilityLabel={accessibilityLabel}
			style={styles.row}
		>
			{months.map((month) => (
				<View key={month.key} style={styles.column}>
					<CompletionCell
						state={month.state}
						size={YEAR_STRIP_CELL}
						today={month.current}
					/>
					<Text
						style={[
							styles.initial,
							{ color: month.current ? colors.ink : colors.faint },
							month.current && styles.current,
						]}
					>
						{month.initial}
					</Text>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	column: {
		alignItems: "center",
		gap: space[100],
	},
	initial: {
		...textStyles.caption,
	},
	current: {
		fontWeight: "600",
	},
});
