import { useEffect, useRef } from "react";
import { Animated, type DimensionValue, Easing } from "react-native";
import { motion, squareRadius } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useReducedMotion } from "@/utils/use-reduced-motion";

type SkeletonProps = {
	width?: DimensionValue;
	height: number;
	circle?: boolean;
	radius?: number;
};

const PULSE_LOW = 0.5;

/**
 * One placeholder shape on the inset surface. It pulses on a 1.2 s loop and sits still with Reduce
 * Motion. Callers decide when it shows (only after 300 ms) and hide its shapes from the screen
 * reader.
 */
export function Skeleton({
	width = "100%",
	height,
	circle = false,
	radius,
}: SkeletonProps) {
	const { colors } = useTheme();
	const reduceMotion = useReducedMotion();
	const opacity = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		if (reduceMotion) {
			opacity.setValue(1);
			return;
		}
		const half = motion.skeleton.loop / 2;
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, {
					toValue: PULSE_LOW,
					duration: half,
					easing: Easing.bezier(...motion.skeleton.easing),
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: half,
					easing: Easing.bezier(...motion.skeleton.easing),
					useNativeDriver: true,
				}),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [reduceMotion, opacity]);

	return (
		<Animated.View
			testID="skeleton"
			style={{
				width: circle ? height : width,
				height,
				borderRadius: circle ? height / 2 : (radius ?? squareRadius(height)),
				backgroundColor: colors.inner,
				opacity,
			}}
		/>
	);
}
