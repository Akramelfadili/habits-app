import { StyleSheet, Text, View } from "react-native";
import { type HabitAccentKey, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { HeatmapCell } from "./heatmap-cell";

const SWATCH = 12;

/**
 * "Less ▢▢▢▢ More | ▢ Frozen" — always shown alongside a heatmap, per the
 * design system, so a frozen cell is never guessed at.
 */
export function HeatmapLegend({ accent }: { accent: HabitAccentKey }) {
	const { colors } = useTheme();
	const label = [styles.label, { color: colors.sub }];

	return (
		<View style={styles.row}>
			<Text style={label}>Less</Text>
			<HeatmapCell state={{ kind: "missed" }} accent={accent} size={SWATCH} />
			{([1, 2, 3] as const).map((level) => (
				<HeatmapCell
					key={level}
					state={{ kind: "level", level }}
					accent={accent}
					size={SWATCH}
				/>
			))}
			<Text style={label}>More</Text>
			<View style={[styles.separator, { backgroundColor: colors.border }]} />
			<HeatmapCell state={{ kind: "frozen" }} accent={accent} size={SWATCH} />
			<Text style={label}>Frozen</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	label: {
		fontSize: typeScale.caption,
		marginHorizontal: 2,
	},
	separator: {
		width: StyleSheet.hairlineWidth,
		height: SWATCH,
		marginHorizontal: 6,
	},
});
