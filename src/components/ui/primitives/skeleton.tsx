import { useEffect, useRef } from "react";
import { Animated, type DimensionValue, Easing } from "react-native";
import { motion, squareRadius } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useReducedMotion } from "@/utils/use-reduced-motion";

type SkeletonProps = {
	width?: DimensionValue;
	height: number;
	/** A fully round shape (the row's circle). */
	circle?: boolean;
	/** The corner radius; an icon square passes `squareRadius(size)`. Defaults to a pill. */
	radius?: number;
};

/** The dimmest the pulse goes (V3-07's loop). */
const PULSE_LOW = 0.5;

/**
 * V3-07 skeleton: one placeholder shape on the inset surface. It pulses on a
 * 1.2 s loop and sits still with Reduce Motion. Callers decide when it shows
 * (only after 300 ms, SY1) and hide its shapes from the screen reader.
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
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: half,
					easing: Easing.inOut(Easing.ease),
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
