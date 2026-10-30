import { StyleSheet, View } from "react-native";
import { space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

/** T-12: a sparkline bar is 6 wide and at most 24 tall. */
export const SPARK_WIDTH = 6;
export const SPARK_HEIGHT = 24;
const STUB = 3;

type SparklineProps = {
	/** One 0–1 value per column; `null` is before the habit started (a dashed stub). */
	values: (number | null)[];
	/** From this column on the bars are amber: the habit is slipping (V3-08). */
	slippingFrom?: number;
	/** This column is still in progress: drawn lighter so it doesn't read as a result. */
	currentIndex?: number;
	/** "Drink water, last 6 weeks: …" — the sparkline is one VoiceOver stop. */
	accessibilityLabel: string;
};

/** V3-08 · sparkline: 6 × 24 pt columns for comparing a few periods beside a habit. Radius min(width ÷ 2, 6). */
export function Sparkline({
	values,
	slippingFrom,
	currentIndex,
	accessibilityLabel,
}: SparklineProps) {
	const { colors } = useTheme();

	return (
		<View
			testID="sparkline"
			accessible
			accessibilityRole="image"
			accessibilityLabel={accessibilityLabel}
			style={styles.row}
		>
			{values.map((value, index) => {
				const slipping = slippingFrom !== undefined && index >= slippingFrom;
				const base =
					index === currentIndex
						? colors.faint
						: slipping
							? colors.warnInk
							: colors.ink;
				return (
					<View
						// biome-ignore lint/suspicious/noArrayIndexKey: columns are positional (one per week)
						key={index}
						testID={value === null ? "sparkline-before-start" : "sparkline-bar"}
						style={[
							styles.bar,
							value === null
								? {
										height: STUB,
										borderColor: colors.outline,
										borderStyle: "dashed",
										borderWidth: 1,
									}
								: {
										height: Math.max(STUB, Math.round(value * SPARK_HEIGHT)),
										backgroundColor: value === 0 ? colors.track : base,
									},
						]}
					/>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "flex-end",
		height: SPARK_HEIGHT,
		gap: space[50],
	},
	bar: {
		width: SPARK_WIDTH,
		borderRadius: SPARK_WIDTH / 2,
	},
});
