import { Pressable, StyleSheet, Text, View } from "react-native";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type CountButtonProps = {
	label: string;
	onPress: () => void;
	accessibilityLabel: string;
	accessibilityHint?: string;
};

/** The visible pill is 28 pt tall; the hit area around it is 44 × 44 at least. */
const PILL_HEIGHT = 28;

/**
 * A quantity row's "5/8" pill, the visible way into the quantity sheet (the circle's long-press is
 * the other).
 */
export function CountButton({
	label,
	onPress,
	accessibilityLabel,
	accessibilityHint,
}: CountButtonProps) {
	const { colors, opacity } = useTheme();

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityHint={accessibilityHint}
			onPress={onPress}
			style={({ pressed }) => [
				styles.hit,
				pressed && { opacity: opacity.pressed },
			]}
		>
			<View style={[styles.pill, { backgroundColor: colors.inner }]}>
				<Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	hit: {
		minWidth: minTouchTarget,
		minHeight: minTouchTarget,
		alignItems: "center",
		justifyContent: "center",
	},
	pill: {
		height: PILL_HEIGHT,
		borderRadius: radius.pill,
		paddingHorizontal: space[300],
		alignItems: "center",
		justifyContent: "center",
	},
	label: {
		...textStyles.subhead,
		fontVariant: ["tabular-nums"],
	},
});
