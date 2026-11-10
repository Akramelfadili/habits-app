import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { log } from "@/lib/logger/logger";

/**
 * True while the OS "Reduce Motion" setting is on, and live as it changes.
 * The single source for every animation in the app (sheet slide, reorder
 * settle, swipe reveal): a component asks this once and drops its motion —
 * it never reads `AccessibilityInfo` itself. Starts false until the first
 * answer arrives (one frame), which is the same as the pre-setting behaviour.
 */
export function useReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		let active = true;
		AccessibilityInfo.isReduceMotionEnabled()
			.then((enabled) => {
				if (active) setReduced(enabled);
			})
			.catch((error) => {
				log.warn("a11y.reduce_motion_read_failed", { error });
			});
		const subscription = AccessibilityInfo.addEventListener(
			"reduceMotionChanged",
			setReduced,
		);
		return () => {
			active = false;
			subscription.remove();
		};
	}, []);

	return reduced;
}
