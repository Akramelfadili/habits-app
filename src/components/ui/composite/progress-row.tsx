import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { ProgressBar } from "./progress-bar";

type ProgressRowProps = {
	label: string;
	/** Trailing count, e.g. "5/7". */
	count: string;
	/** 0–1, passed straight to the bar. */
	value: number;
	/** "warning" is the flagged/slipping treatment — the bar only, the label stays ink. */
	tone?: "default" | "warning";
	/** NEW-21's leading 28px habit badge; omitted, the row is label-and-bar only. */
	badge?: ReactNode;
};

/** Label + trailing count over a ProgressBar, optionally badged — Weekly Summary's per-habit list (HAB-11, NEW-21 progress slot). */
export function ProgressRow({
	label,
	count,
	value,
	tone = "default",
	badge,
}: ProgressRowProps) {
	const { colors } = useTheme();

	return (
		<View
			accessible
			accessibilityLabel={`${label}: ${count}`}
			style={styles.row}
		>
			{badge}
			<View style={styles.body}>
				<View style={styles.labels}>
					<Text numberOfLines={1} style={[styles.label, { color: colors.ink }]}>
						{label}
					</Text>
					<Text style={[styles.count, { color: colors.sub }]}>{count}</Text>
				</View>
				<ProgressBar value={value} tone={tone} />
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
	body: {
		flex: 1,
		gap: 8,
	},
	labels: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "baseline",
		gap: 12,
	},
	label: {
		flex: 1,
		fontSize: typeScale.rowLabel,
	},
	count: {
		fontSize: typeScale.subtitle,
	},
});
