import { useState } from "react";
import {
	type LayoutChangeEvent,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { minTouchTarget, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { CompletionRows, type CompletionRowsCell } from "./completion-rows";

/** A year cell: 16 pt, below 44 by design, never tappable. */
export const YEAR_CELL = 16;
const WIDE_GAP = space[50];
const NARROW_GAP = 1;
const WEEKDAYS = 7;

export type YearMonthLabel = {
	key: string;
	label: string;
	column: number;
	accessibilityLabel: string;
	onPress: () => void;
};

export type YearBand = {
	key: string;
	months: YearMonthLabel[];
	columns: (CompletionRowsCell | null)[][];
};

type YearHeatMapProps = {
	bands: YearBand[];
	/** Show only this band's index (Year too early shows the current band alone). */
	onlyBand?: number;
};

export function bandRows(columns: YearBand["columns"]) {
	return Array.from({ length: WEEKDAYS }, (_, weekday) =>
		columns.map((column) => column[weekday] ?? null),
	);
}

/**
 * Three bands of four months, one 16 pt cell per day, a column per week and a row per weekday
 * (Mon → Sun). The month labels are the only targets (44 pt high, via hitSlop) and open that month;
 * the cells are hidden from VoiceOver, as the month list is the screen-reader view.
 */
export function YearHeatMap({ bands, onlyBand }: YearHeatMapProps) {
	const { colors, opacity } = useTheme();
	const [width, setWidth] = useState(0);
	const visible =
		onlyBand === undefined ? bands : bands.filter((_, i) => i === onlyBand);

	const onLayout = ({ nativeEvent }: LayoutChangeEvent) =>
		setWidth(nativeEvent.layout.width);

	return (
		<View testID="year-heat-map" onLayout={onLayout} style={styles.map}>
			{visible.map((band) => {
				const columns = band.columns.length;
				// 16 pt cells with 2 pt gaps; a 19-week band squeezes the gap to 1 so it still fits.
				const gap =
					width > 0 && columns * YEAR_CELL + (columns - 1) * WIDE_GAP > width
						? NARROW_GAP
						: WIDE_GAP;
				const pitch = YEAR_CELL + gap;
				return (
					<View
						key={band.key}
						testID={`year-band-${band.key}`}
						style={styles.band}
					>
						<View style={styles.labels}>
							{band.months.map((month) => (
								<Pressable
									key={month.key}
									testID={`year-month-${month.key}`}
									accessibilityRole="button"
									accessibilityLabel={month.accessibilityLabel}
									onPress={month.onPress}
									hitSlop={{
										top: (minTouchTarget - textStyles.caption.lineHeight) / 2,
										bottom:
											(minTouchTarget - textStyles.caption.lineHeight) / 2,
										left: space[100],
										right: space[100],
									}}
									style={({ pressed }) => [
										styles.label,
										{ left: month.column * pitch },
										pressed && { opacity: opacity.pressed },
									]}
								>
									<Text style={[styles.labelText, { color: colors.ink }]}>
										{month.label}
									</Text>
								</Pressable>
							))}
						</View>
						<CompletionRows
							rows={bandRows(band.columns).map((row) =>
								row.map((cell) => (cell ? { ...cell, hidden: true } : null)),
							)}
							size={YEAR_CELL}
							gap={gap}
							testID={`year-band-rows-${band.key}`}
						/>
					</View>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	map: {
		gap: space[300],
	},
	band: {
		gap: space[100],
	},
	labels: {
		height: textStyles.caption.lineHeight,
	},
	label: {
		position: "absolute",
		top: 0,
		// Months start at least four columns (72 pt) apart, so the label can be
		// 44 pt wide, growing to the right, without reaching the next one.
		minWidth: minTouchTarget,
	},
	labelText: {
		...textStyles.caption,
	},
});
