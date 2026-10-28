import { Animated, StyleSheet, Text, View } from "react-native";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useFillAnimation } from "@/utils/use-fill-animation";

/** V3-09: the ring is 10 pt thick (T-09). */
export const RING_STROKE = 10;
export const RING_SIZE = 104;

type RateRingProps = {
	/** Whole points; `null` while too early: a dashed ring and a dash. */
	percent: number | null;
	/** Under the number: "this month", "perfect", "day 3 of 7". */
	label: string;
	/** The whole ring in one sentence for VoiceOver. */
	accessibilityLabel: string;
};

/**
 * V3-09 · rate ring: the overall rate as a whole number inside a solid accent
 * arc (no gradient) on the decorative track, label below the number. Read-only;
 * used once, on the Month overview. The arc fills over the "fill" token and
 * jumps with Reduce Motion. Drawn from two clipped half-rings, so it needs no
 * native drawing library.
 */
export function RateRing({
	percent,
	label,
	accessibilityLabel,
}: RateRingProps) {
	const { colors } = useTheme();
	const fraction =
		percent === null ? 0 : Math.min(1, Math.max(0, percent / 100));
	const animated = useFillAnimation(fraction);
	// Each half-ring is a circle with two coloured sides, turned 45° so it spans exactly 180°.
	const rightTurn = animated.interpolate({
		inputRange: [0, 0.5],
		outputRange: ["-135deg", "45deg"],
		extrapolate: "clamp",
	});
	const leftTurn = animated.interpolate({
		inputRange: [0.5, 1],
		outputRange: ["-135deg", "45deg"],
		extrapolate: "clamp",
	});
	const half = RING_SIZE / 2;
	const circle = {
		position: "absolute",
		top: 0,
		width: RING_SIZE,
		height: RING_SIZE,
		borderRadius: half,
		borderWidth: RING_STROKE,
		borderColor: "transparent",
	} as const;

	return (
		<View
			testID="rate-ring"
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel={accessibilityLabel}
			accessibilityValue={
				percent === null ? undefined : { min: 0, max: 100, now: percent }
			}
			style={styles.ring}
		>
			{percent === null ? (
				<View
					testID="rate-ring-too-early"
					style={[styles.dashed, { borderColor: colors.outline }]}
				/>
			) : (
				<>
					<View style={[circle, { left: 0, borderColor: colors.track }]} />
					<View style={[styles.clip, { left: half }]}>
						<Animated.View
							testID="rate-ring-right"
							style={[
								circle,
								{
									left: -half,
									borderTopColor: colors.accent,
									borderRightColor: colors.accent,
									transform: [{ rotate: rightTurn }],
								},
							]}
						/>
					</View>
					<View style={[styles.clip, { left: 0 }]}>
						<Animated.View
							testID="rate-ring-left"
							style={[
								circle,
								{
									left: 0,
									borderBottomColor: colors.accent,
									borderLeftColor: colors.accent,
									transform: [{ rotate: leftTurn }],
								},
							]}
						/>
					</View>
				</>
			)}
			<View style={styles.center} pointerEvents="none">
				<Text style={[styles.value, { color: colors.ink }]}>
					{percent === null ? "—" : `${percent}%`}
				</Text>
				<Text style={[styles.label, { color: colors.sub }]}>{label}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	ring: {
		width: RING_SIZE,
		height: RING_SIZE,
	},
	clip: {
		position: "absolute",
		top: 0,
		width: RING_SIZE / 2,
		height: RING_SIZE,
		overflow: "hidden",
	},
	dashed: {
		width: RING_SIZE,
		height: RING_SIZE,
		borderRadius: RING_SIZE / 2,
		borderWidth: 2,
		borderStyle: "dashed",
	},
	center: {
		...StyleSheet.absoluteFill,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: RING_STROKE,
		gap: space[50],
	},
	value: {
		...textStyles.title,
		fontVariant: ["tabular-nums"],
	},
	label: {
		...textStyles.caption,
		textAlign: "center",
	},
});
