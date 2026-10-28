import { useState } from "react";
import {
	Animated,
	type LayoutChangeEvent,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useFillAnimation } from "@/utils/use-fill-animation";

/** V3-08's chart: 12 columns × 96 pt by default. */
export const CHART_HEIGHT = 96;
const STUB = 3;
const MAX_RADIUS = 6;

export type ChartColumnState =
	| "complete"
	/** The period still running: a lighter bar, its label in ink. */
	| "current"
	/** Before the history began: a dashed stub, never hidden. */
	| "before-start"
	/** Still ahead: an outlined stub. */
	| "future";

export type ChartColumn = {
	key: string;
	/** 0–1; ignored for before-start and future. */
	value: number;
	state?: ChartColumnState;
	/** The axis: a month initial or weekday letter. */
	label: string;
	/** A second axis line under the label ("83%"). */
	valueLabel?: string;
	/** What the rotor reads for this bar: "September, 100 percent". */
	accessibilityLabel: string;
};

type ColumnChartProps = {
	columns: ChartColumn[];
	height?: number;
	/** The whole chart in one sentence ("Meditate, Mar to Oct, best September 100 percent"). */
	summary: string;
};

function Bar({
	column,
	height,
	radius,
}: {
	column: ChartColumn;
	height: number;
	radius: number;
}) {
	const { colors } = useTheme();
	const state = column.state ?? "complete";
	const fraction =
		state === "before-start" || state === "future"
			? 0
			: Math.min(1, Math.max(0, column.value));
	const animated = useFillAnimation(fraction);

	if (state === "before-start" || state === "future") {
		return (
			<View
				testID={`chart-bar-${state}`}
				style={[
					styles.stub,
					{
						borderRadius: radius,
						borderColor: state === "future" ? colors.border : colors.outline,
						borderStyle: state === "future" ? "solid" : "dashed",
					},
				]}
			/>
		);
	}

	return (
		<Animated.View
			testID={`chart-bar-${state}`}
			style={{
				borderRadius: radius,
				backgroundColor:
					fraction === 0
						? colors.track
						: state === "current"
							? colors.faint
							: colors.ink,
				height: animated.interpolate({
					inputRange: [0, 1],
					outputRange: [STUB, Math.max(STUB, height)],
				}),
			}}
		/>
	);
}

/**
 * V3-08 · chart: one column per period, scaled to the tallest possible (1),
 * radius min(width ÷ 2, 6). Bars rise over the "fill" token and jump with
 * Reduce Motion. For VoiceOver it is one adjustable element: the summary,
 * and swipe up or down steps from bar to bar (08.3).
 */
export function ColumnChart({
	columns,
	height = CHART_HEIGHT,
	summary,
}: ColumnChartProps) {
	const { colors } = useTheme();
	const [width, setWidth] = useState(0);
	const [focused, setFocused] = useState(0);
	const barWidth =
		width > 0 && columns.length > 0
			? (width - (columns.length - 1) * space[150]) / columns.length
			: MAX_RADIUS * 2;
	const radius = Math.min(barWidth / 2, MAX_RADIUS);

	const step = (direction: 1 | -1) =>
		setFocused((index) =>
			Math.min(columns.length - 1, Math.max(0, index + direction)),
		);

	return (
		<View
			testID="column-chart"
			accessible
			accessibilityRole="adjustable"
			accessibilityLabel={summary}
			accessibilityValue={{ text: columns[focused]?.accessibilityLabel }}
			accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
			onAccessibilityAction={({ nativeEvent }) =>
				step(nativeEvent.actionName === "increment" ? 1 : -1)
			}
			onLayout={({ nativeEvent }: LayoutChangeEvent) =>
				setWidth(nativeEvent.layout.width)
			}
			style={styles.chart}
		>
			{columns.map((column) => (
				<View key={column.key} style={styles.column}>
					<View style={[styles.track, { height }]}>
						<Bar column={column} height={height} radius={radius} />
					</View>
					<Text
						style={[
							styles.axis,
							column.state === "current"
								? [{ color: colors.ink }, styles.current]
								: { color: colors.faint },
						]}
					>
						{column.label}
					</Text>
					{column.valueLabel ? (
						<Text style={[styles.axis, { color: colors.sub }]}>
							{column.valueLabel}
						</Text>
					) : null}
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	chart: {
		flexDirection: "row",
		gap: space[150],
	},
	column: {
		flex: 1,
		gap: space[100],
	},
	track: {
		justifyContent: "flex-end",
	},
	stub: {
		height: space[200],
		borderWidth: 1,
	},
	axis: {
		...textStyles.caption,
		textAlign: "center",
		fontVariant: ["tabular-nums"],
	},
	current: {
		fontWeight: "600",
	},
});
