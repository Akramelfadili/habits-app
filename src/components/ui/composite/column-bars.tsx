import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

/** A chart column's state (NEW-17, chart context). */
export type ChartColumnState =
	/** A finished month. */
	| "complete"
	/** The month still running — a lighter bar, so it doesn't read as a result. */
	| "current"
	/** Before the history began, or still ahead — a dashed slot, never hidden. */
	| "empty";

type ColumnBarsProps = {
	/**
	 * One 0–1 value per column; null is an empty slot (nothing was scheduled).
	 * In the chart context, `states` decides how each is drawn.
	 */
	values: (number | null)[];
	/** "slipping" is the flagged amber treatment (NEW-08's slipping state). Sparkline only. */
	tone?: "default" | "slipping";
	/**
	 * "sparkline" is the 18px trend beside a habit (Monthly); "chart" is the
	 * 96px-tall bar chart in a chart card (Yearly, HAB-17).
	 */
	context?: "sparkline" | "chart";
	/** Chart only: one state per column — omitted, every column is "complete". */
	states?: ChartColumnState[];
	/** Chart only: the axis under each column (NEW-30's month initials). */
	labels?: string[];
	accessibilityLabel?: string;
};

const SPARKLINE_HEIGHT = 18;
const BAR_WIDTH = 4;
const MIN_BAR = 2;
const CHART_HEIGHT = 96;
const CHART_MIN_BAR = 4;
const CHART_EMPTY_HEIGHT = 14;

/**
 * The one column bar (NEW-17): a series meant for comparison, scaled to the
 * tallest possible (1). The sparkline is a thin column per value (Monthly's
 * weeks); the chart fills 96px with a column per month under an axis
 * (Yearly's "Completion by month").
 */
export function ColumnBars({
	values,
	tone = "default",
	context = "sparkline",
	states,
	labels,
	accessibilityLabel,
}: ColumnBarsProps) {
	const { colors } = useTheme();

	if (context === "chart") {
		return (
			<View
				testID="column-chart"
				accessible={accessibilityLabel !== undefined}
				accessibilityLabel={accessibilityLabel}
				style={styles.chart}
			>
				{values.map((value, index) => {
					const state = states?.[index] ?? "complete";
					const empty = state === "empty" || value === null;
					return (
						<View
							// biome-ignore lint/suspicious/noArrayIndexKey: columns are positional (one per month)
							key={index}
							style={styles.chartColumn}
						>
							<View style={styles.chartTrack}>
								{empty ? (
									<View
										testID="chart-bar-empty"
										style={[styles.chartEmpty, { borderColor: colors.border }]}
									/>
								) : (
									<View
										testID={`chart-bar-${state}`}
										style={[
											styles.chartBar,
											{
												height: Math.max(
													CHART_MIN_BAR,
													Math.round(value * CHART_HEIGHT),
												),
												backgroundColor:
													state === "current" ? colors.faint : colors.ink,
											},
										]}
									/>
								)}
							</View>
							{labels ? (
								<Text
									style={[
										styles.axis,
										state === "current"
											? { color: colors.ink, fontWeight: "600" }
											: { color: colors.faint },
									]}
								>
									{labels[index]}
								</Text>
							) : null}
						</View>
					);
				})}
			</View>
		);
	}

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
									: Math.max(MIN_BAR, Math.round(value * SPARKLINE_HEIGHT)),
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
		height: SPARKLINE_HEIGHT,
		gap: 2,
	},
	bar: {
		width: BAR_WIDTH,
		borderRadius: 1,
	},
	chart: {
		flexDirection: "row",
		gap: 6,
	},
	chartColumn: {
		flex: 1,
		gap: 8,
	},
	chartTrack: {
		height: CHART_HEIGHT,
		justifyContent: "flex-end",
	},
	chartBar: {
		borderRadius: 4,
	},
	chartEmpty: {
		height: CHART_EMPTY_HEIGHT,
		borderRadius: 4,
		borderWidth: 1,
		borderStyle: "dashed",
	},
	axis: {
		textAlign: "center",
		fontSize: typeScale.micro,
	},
});
