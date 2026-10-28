import { StyleSheet, View } from "react-native";
import { cellRadius, intensityColor, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

/** V3-06's compact year strip (T-10): twelve month cells, 12 wide × 24 tall. */
export const YEAR_STRIP_WIDTH = 12;
export const YEAR_STRIP_HEIGHT = 24;

export type YearStripMonth = {
	key: string;
	/** 0–3 by the month's rate; null when nothing was counted (a dashed slot). */
	level: 0 | 1 | 2 | 3 | null;
};

type YearStripProps = {
	months: YearStripMonth[];
	/** One summary for VoiceOver ("Meditate, September 100 percent …"): the strip is one stop. */
	accessibilityLabel: string;
};

/** V3-06 · compact year strip: a habit's twelve months in one short row. */
export function YearStrip({ months, accessibilityLabel }: YearStripProps) {
	const { colors, scheme } = useTheme();

	return (
		<View
			testID="year-strip"
			accessible
			accessibilityRole="image"
			accessibilityLabel={accessibilityLabel}
			style={styles.row}
		>
			{months.map((month) => (
				<View
					key={month.key}
					testID={`year-strip-${month.level === null ? "empty" : month.level}`}
					style={[
						styles.cell,
						month.level === null
							? { borderColor: colors.outline, borderStyle: "dashed" }
							: { backgroundColor: intensityColor(month.level, scheme) },
					]}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		gap: space[50],
	},
	cell: {
		width: YEAR_STRIP_WIDTH,
		height: YEAR_STRIP_HEIGHT,
		borderRadius: cellRadius(YEAR_STRIP_WIDTH),
		borderWidth: 1,
		borderColor: "transparent",
	},
});
