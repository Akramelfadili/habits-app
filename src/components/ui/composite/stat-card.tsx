import { StyleSheet, Text, View } from "react-native";
import { letterSpacing, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";

type StatCardProps = {
	label: string;
	value: string;
	caption: string;
	/** "warning" is amber for the at-risk fact only: the numeral and caption, on the card. */
	tone?: "default" | "warning";
	muted?: boolean;
};

/**
 * One size everywhere: padding 12 (16 at AX sizes), 2 pt between label, value and sub, no minimum
 * height, no icons. Label caption in caps, value in the stat style, sub in footnote. A tile is one
 * VoiceOver stop. At AX sizes the screen lays tiles out 1-up.
 */
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
