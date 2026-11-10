import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { log } from "@/lib/logger/logger";

// The single source for every animation: components never read `AccessibilityInfo` themselves.
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
