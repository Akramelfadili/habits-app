import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type ColumnBarsProps = {
	/** One 0–1 value per column; null is an empty slot (nothing was scheduled). */
	values: (number | null)[];
	/** "slipping" is the flagged amber treatment (NEW-08's slipping state). */
	tone?: "default" | "slipping";
	accessibilityLabel?: string;
};

const HEIGHT = 18;
const BAR_WIDTH = 4;
const MIN_BAR = 2;

/**
 * The sparkline column bar (NEW-17, sparkline context at 18px): one thin
 * column per value, scaled to the tallest possible (1). The 96px chart
 * context joins with HAB-17's yearly chart.
 */
export function ColumnBars({
	values,
	tone = "default",
	accessibilityLabel,
}: ColumnBarsProps) {
	const { colors } = useTheme();
	const fill = tone === "slipping" ? colors.warnInk : colors.ink;

	return (
		<View
			testID="column-bars"
			accessible={accessibilityLabel !== undefined}
			accessibilityLabel={accessibilityLabel}
			style={styles.row}
		>
			{values.map((value, index) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: columns are positional (one per week)
					key={index}
					testID="column-bar"
					style={[
						styles.bar,
						{
							height:
								value === null
									? MIN_BAR
									: Math.max(MIN_BAR, Math.round(value * HEIGHT)),
							backgroundColor: value === null ? colors.track : fill,
						},
					]}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "flex-end",
		height: HEIGHT,
		gap: 2,
	},
	bar: {
		width: BAR_WIDTH,
		borderRadius: 1,
	},
});
