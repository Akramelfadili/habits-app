import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { motion } from "@/theme/theme";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * A 0–1 value that eases to `fraction` over F-07's "fill" token (450 ms,
 * cubic-bezier(.22, 1, .36, 1)) — the one motion for bars, rings and columns.
 * With Reduce Motion it jumps straight to the value.
 */
export function useFillAnimation(fraction: number): Animated.Value {
	const reduceMotion = useReducedMotion();
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

	return animated;
}
