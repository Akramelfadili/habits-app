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

	// What the value is heading to; on mount it already holds `fraction`, and
	// animating to where it already is would only burn 450 ms of re-renders.
	const target = useRef(fraction);

	useEffect(() => {
		if (reduceMotion) {
			target.current = fraction;
			animated.setValue(fraction);
			return;
		}
		if (target.current === fraction) return;
		target.current = fraction;
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
