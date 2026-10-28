import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { motion, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useReducedMotion } from "@/utils/use-reduced-motion";

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
	const reduceMotion = useReducedMotion();
	const fraction = Math.min(1, Math.max(0, value));
	const percent = Math.round(fraction * PERCENT);
	const animated = useRef(new Animated.Value(fraction)).current;

	useEffect(() => {
		if (reduceMotion) {
			animated.setValue(fraction);
			return;
		}
		const run = Animated.timing(animated, {
			toValue: fraction,
			duration: motion.fill.duration,
			easing: Easing.bezier(...motion.fill.easing),
			useNativeDriver: false,
		});
		run.start();
		return () => run.stop();
	}, [fraction, reduceMotion, animated]);

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
