import { Animated, StyleSheet, Text, View } from "react-native";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useFillAnimation } from "@/utils/use-fill-animation";

type ProgressBarProps = {
	/** 0–1. Values outside that range are clamped. */
	value: number;
	/** "warning" is the flagged/slipping treatment. */
	tone?: "default" | "warning";
	/**
	 * V3-07: the count on the left ("1 of 5 done"). When given, a whole-number
	 * percentage sits on the right and both read as one stop for VoiceOver.
	 */
	label?: string;
};

const PERCENT = 100;
const TRACK_HEIGHT = 6;

/** V3-07: 6 pt track, count left, whole-number % right. Fills over 450 ms (F-07); Reduce Motion jumps. */
export function ProgressBar({
	value,
	tone = "default",
	label,
}: ProgressBarProps) {
	const { colors } = useTheme();
	const fraction = Math.min(1, Math.max(0, value));
	const percent = Math.round(fraction * PERCENT);
	const animated = useFillAnimation(fraction);

	const bar = (
		<View
			testID="progress-bar"
			style={[styles.track, { backgroundColor: colors.track }]}
			accessibilityRole="progressbar"
			accessibilityValue={{ min: 0, max: PERCENT, now: percent }}
		>
			<Animated.View
				style={[
					styles.fill,
					{
						width: animated.interpolate({
							inputRange: [0, 1],
							outputRange: ["0%", "100%"],
						}),
						backgroundColor:
							tone === "warning" ? colors.warnInk : colors.accent,
					},
				]}
			/>
		</View>
	);

	if (!label) return bar;

	return (
		<View
			accessible
			accessibilityLabel={`${label}, ${percent} percent`}
			style={styles.block}
		>
			<View style={styles.labelRow}>
				<Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
				<Text style={[styles.label, styles.percent, { color: colors.sub }]}>
					{percent}%
				</Text>
			</View>
			{bar}
		</View>
	);
}

const styles = StyleSheet.create({
	block: {
		gap: space[150],
	},
	labelRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	label: {
		...textStyles.subhead,
	},
	percent: {
		fontVariant: ["tabular-nums"],
	},
	track: {
		height: TRACK_HEIGHT,
		borderRadius: radius.pill,
		overflow: "hidden",
	},
	fill: {
		height: "100%",
		borderRadius: radius.pill,
	},
});
