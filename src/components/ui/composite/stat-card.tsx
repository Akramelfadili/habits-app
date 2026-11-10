import { StyleSheet, Text, View } from "react-native";
import { letterSpacing, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";

type StatCardProps = {
	label: string;
	value: string;
	caption: string;
	tone?: "default" | "warning";
	muted?: boolean;
};

export function StatCard({
	label,
	value,
	caption,
	tone = "default",
	muted = false,
}: StatCardProps) {
	const { colors } = useTheme();
	const largeText = useAccessibilityTextSize();
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
				{ backgroundColor: colors.card, borderColor: colors.border },
				largeText && styles.cardLarge,
			]}
		>
			<Text style={[styles.label, { color: colors.sub }]}>
				{label.toUpperCase()}
			</Text>
			<Text style={[styles.value, { color: valueColor }]}>{value}</Text>
			<Text
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
		borderRadius: radius.l,
		borderWidth: StyleSheet.hairlineWidth,
		padding: space[300],
		gap: space[50],
	},
	cardLarge: {
		padding: space[400],
	},
	label: {
		...textStyles.caption,
		letterSpacing: letterSpacing.label,
	},
	value: {
		...textStyles.stat,
		fontVariant: ["tabular-nums"],
	},
	caption: {
		...textStyles.footnote,
	},
});
