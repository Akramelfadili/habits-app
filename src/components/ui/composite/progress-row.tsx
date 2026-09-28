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
};

/** Label + trailing count over a ProgressBar — Weekly Summary's per-habit list (HAB-11). */
export function ProgressRow({
	label,
	count,
	value,
	tone = "default",
}: ProgressRowProps) {
	const { colors } = useTheme();

	return (
		<View
			accessible
			accessibilityLabel={`${label}: ${count}`}
			style={styles.row}
		>
			<View style={styles.labels}>
				<Text numberOfLines={1} style={[styles.label, { color: colors.ink }]}>
					{label}
				</Text>
				<Text style={[styles.count, { color: colors.sub }]}>{count}</Text>
			</View>
			<ProgressBar value={value} tone={tone} />
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
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
