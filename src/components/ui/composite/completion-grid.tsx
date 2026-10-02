import { StyleSheet, Text, View } from "react-native";
import type { AccentHue } from "@/theme/theme";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { HeatmapCell, type HeatmapCellState } from "./heatmap-cell";

export type CompletionGridCell = {
	key: string;
	state: HeatmapCellState;
	accessibilityLabel?: string;
	/** Set on a tappable cell (Detail's retro-log entry point); read-only otherwise. */
	onPress?: () => void;
};

type CompletionGridProps = {
	/** Rows of cells; `null` is blank space (the month calendar's days outside the month). */
	rows: (CompletionGridCell | null)[][];
	/** The accent hue for shaded cells; null is the neutral (grey) ramp. */
	accent: AccentHue;
	/**
	 * NEW-07's layouts. "detail" is Habit Detail's weekday-rows × week-columns
	 * of 18px squares; "month" is the Monthly calendar — a Monday-first
	 * weekday axis over 16px-high pills that fill the width. (The 11px year
	 * strip joins with HAB-17.)
	 */
	layout: "detail" | "month";
};

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DETAIL_CELL = 18;
const DETAIL_GAP = 5;
const MONTH_CELL_HEIGHT = 16;
const MONTH_GAP = 6;

/** The one completion grid (NEW-07) — every calendar-shaped history in the app. */
export function CompletionGrid({ rows, accent, layout }: CompletionGridProps) {
	const { colors } = useTheme();
	const isMonth = layout === "month";
	const gap = isMonth ? MONTH_GAP : DETAIL_GAP;

	return (
		<View testID={`completion-grid-${layout}`} style={{ gap }}>
			{isMonth ? (
				<View style={[styles.row, { gap }]}>
					{WEEKDAY_LETTERS.map((letter, index) => (
						<Text
							// biome-ignore lint/suspicious/noArrayIndexKey: the seven weekday columns are fixed
							key={index}
							style={[styles.axis, { color: colors.faint }]}
						>
							{letter}
						</Text>
					))}
				</View>
			) : null}
			{rows.map((row, rowIndex) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: rows are a fixed positional layout
					key={rowIndex}
					style={[styles.row, { gap }]}
				>
					{row.map((cell, columnIndex) =>
						cell ? (
							<HeatmapCell
								key={cell.key}
								state={cell.state}
								accent={accent}
								size={isMonth ? undefined : DETAIL_CELL}
								height={isMonth ? MONTH_CELL_HEIGHT : undefined}
								ramp={isMonth ? "ink" : "accent"}
								accessibilityLabel={cell.accessibilityLabel}
								onPress={cell.onPress}
							/>
						) : (
							<View
								// biome-ignore lint/suspicious/noArrayIndexKey: blank slots are positional
								key={`blank-${columnIndex}`}
								style={
									isMonth
										? styles.blankMonth
										: { width: DETAIL_CELL, height: DETAIL_CELL }
								}
							/>
						),
					)}
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
	},
	axis: {
		flex: 1,
		textAlign: "center",
		fontSize: typeScale.micro,
	},
	// Same 1px border as a cell, so a row with blanks keeps its cells' width.
	blankMonth: {
		flex: 1,
		height: MONTH_CELL_HEIGHT,
		borderWidth: 1,
		borderColor: "transparent",
	},
});
