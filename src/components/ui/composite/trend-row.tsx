import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { DeltaLabel } from "../primitives/delta-label";

type TrendRowProps = {
	label: string;
	/** NEW-21's leading 28px habit badge. */
	badge: ReactNode;
	/** The sparkline slot (ColumnBars). */
	trend: ReactNode;
	/** The period's headline figure, e.g. "97%". */
	value: string;
	/** Percentage points vs the previous period; null shows nothing (no data to compare). */
	deltaPoints: number | null;
	/** Spoken summary — the row reads as one element. */
	accessibilityLabel: string;
};

/**
 * One habit's row on Monthly (NEW-21, sparkline slot): badge, name, weekly
 * trend, rate and delta vs the previous month (NEW-20).
 */
export function TrendRow({
	label,
	badge,
	trend,
	value,
	deltaPoints,
	accessibilityLabel,
}: TrendRowProps) {
	const { colors } = useTheme();

	return (
		<View accessible accessibilityLabel={accessibilityLabel} style={styles.row}>
			{badge}
			<Text numberOfLines={1} style={[styles.label, { color: colors.ink }]}>
				{label}
			</Text>
			{trend}
			<Text style={[styles.value, { color: colors.ink }]}>{value}</Text>
			<View style={styles.delta}>
				{deltaPoints !== null ? <DeltaLabel points={deltaPoints} /> : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	label: {
		flex: 1,
		fontSize: typeScale.rowLabel,
	},
	value: {
		fontSize: typeScale.subtitle,
		fontWeight: "500",
		fontVariant: ["tabular-nums"],
		minWidth: 36,
		textAlign: "right",
	},
	delta: {
		minWidth: 24,
	},
});
