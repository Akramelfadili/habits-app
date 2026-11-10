import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { motion } from "@/theme/theme";
import { useReducedMotion } from "./use-reduced-motion";

export function useFillAnimation(fraction: number): Animated.Value {
	const reduceMotion = useReducedMotion();
	const animated = useRef(new Animated.Value(fraction)).current;

	// On mount it already holds `fraction`; animating to where it is would only burn 450 ms of re-renders.
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
