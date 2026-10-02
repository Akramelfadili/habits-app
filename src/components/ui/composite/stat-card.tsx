import { StyleSheet, Text, View } from "react-native";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type StatCardProps = {
	/** Small all-caps eyebrow ("CURRENT", "90 DAYS"). */
	label: string;
	/** The large numeral ("24", "87%", "—"). */
	value: string;
	/** One short line under the numeral ("day streak", "78 of 90 days"). */
	caption: string;
	/** "warning" is the amber-tinted flagged variant (e.g. an at-risk count). */
	tone?: "default" | "warning";
	/** Nothing to show yet (zero / dash) — the numeral recedes to secondary ink. */
	muted?: boolean;
};

/** Large-numeral stat tile (design-system "Stat card") — streaks, rates, week totals. */
export function StatCard({
	label,
	value,
	caption,
	tone = "default",
	muted = false,
}: StatCardProps) {
	const { colors } = useTheme();
	const isWarning = tone === "warning";
	const valueColor = isWarning
		? colors.warnInk
		: muted
			? colors.sub
			: colors.ink;

	return (
		<View
			accessible
			accessibilityLabel={`${label}: ${value}, ${caption}`}
			style={[
				styles.card,
				isWarning
					? { backgroundColor: colors.warnTint, borderColor: colors.warnTint }
					: { backgroundColor: colors.card, borderColor: colors.border },
			]}
		>
			<Text
				style={[
					styles.label,
					{ color: isWarning ? colors.warnInk : colors.sub },
				]}
			>
				{label.toUpperCase()}
			</Text>
			<Text style={[styles.value, { color: valueColor }]}>{value}</Text>
			<Text
				numberOfLines={1}
				style={[
					styles.caption,
					{ color: isWarning ? colors.warnInk : colors.sub },
				]}
			>
				{caption}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		flex: 1,
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 12,
		paddingVertical: 14,
		gap: 6,
	},
	label: {
		fontSize: typeScale.caption,
		fontWeight: "500",
		letterSpacing: 0.8,
	},
	value: {
		fontSize: typeScale.stat,
		fontWeight: "500",
	},
	caption: {
		fontSize: typeScale.caption,
	},
});
