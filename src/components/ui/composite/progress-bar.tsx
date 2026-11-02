import { useEffect, useRef, useState } from "react";
import {
	Animated,
	Easing,
	type LayoutChangeEvent,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useFillAnimation } from "@/utils/use-fill-animation";
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
	/**
	 * Work with no measurable progress (SY3, a migration): a segment sweeps along
	 * the track instead of a fill, `value` is ignored and no percentage is said.
	 * With Reduce Motion the segment sits still.
	 */
	indeterminate?: boolean;
};

const PERCENT = 100;
const TRACK_HEIGHT = 6;
/** The sweeping segment's share of the track, and how long one pass takes. */
const SEGMENT_SHARE = 0.35;
const SWEEP_MS = 1200;

/** V3-07: 6 pt track, count left, whole-number % right. Fills over 450 ms (F-07); Reduce Motion jumps. */
export function ProgressBar({
	value,
	tone = "default",
	label,
	indeterminate = false,
}: ProgressBarProps) {
	if (indeterminate) return <IndeterminateBar label={label} />;
	return <DeterminateBar value={value} tone={tone} label={label} />;
}

function DeterminateBar({
	value,
	tone,
	label,
}: Pick<ProgressBarProps, "value" | "tone" | "label">) {
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

/** The indeterminate form: a sweeping segment, announced as busy rather than as a percentage. */
function IndeterminateBar({ label }: { label?: string }) {
	const { colors } = useTheme();
	const reduceMotion = useReducedMotion();
	const [width, setWidth] = useState(0);
	const progress = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (width === 0) return;
		if (reduceMotion) {
			// Still: the segment rests at the track's left end instead of sweeping.
			progress.setValue(
				(width * SEGMENT_SHARE) / (width * (1 + SEGMENT_SHARE)),
			);
			return;
		}
		const sweep = Animated.loop(
			Animated.timing(progress, {
				toValue: 1,
				duration: SWEEP_MS,
				easing: Easing.inOut(Easing.ease),
				useNativeDriver: true,
			}),
		);
		sweep.start();
		return () => sweep.stop();
	}, [reduceMotion, width, progress]);

	const segment = width * SEGMENT_SHARE;
	const bar = (
		<View
			testID="progress-bar"
			onLayout={(event: LayoutChangeEvent) =>
				setWidth(event.nativeEvent.layout.width)
			}
			style={[styles.track, { backgroundColor: colors.track }]}
			accessibilityRole="progressbar"
			accessibilityState={{ busy: true }}
		>
			<Animated.View
				testID="progress-bar-segment"
				style={[
					styles.fill,
					{
						width: segment,
						backgroundColor: colors.accent,
						transform: [
							{
								translateX: progress.interpolate({
									inputRange: [0, 1],
									outputRange: [-segment, width],
								}),
							},
						],
					},
				]}
			/>
		</View>
	);

	if (!label) return bar;
	return (
		<View accessible accessibilityLabel={label} style={styles.block}>
			<Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
			{bar}
		</View>
	);
}
