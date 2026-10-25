import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * True while the OS "Reduce Transparency" setting is on, and live as it
 * changes. The single source for every translucent material in the app — the
 * floating tab-bar pill today (V3-01 B, 08.5) — which falls back to a solid
 * surface.
 *
 * iOS-only: react-native-web does not implement `isReduceTransparencyEnabled`
 * *at all* (not "returns false" — the method is missing), so both the query
 * and the subscription are feature-detected. Everywhere else the answer is
 * false, which is the right default.
 *
 * Starts false until the first answer arrives (one frame), as
 * `useReducedMotion` does.
 */
export function useReducedTransparency(): boolean {
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		if (typeof AccessibilityInfo.isReduceTransparencyEnabled !== "function") {
			return;
		}
		let active = true;
		AccessibilityInfo.isReduceTransparencyEnabled()
			.then((enabled) => {
				if (active) setReduced(enabled);
			})
			.catch(() => {});
		const subscription = AccessibilityInfo.addEventListener(
			"reduceTransparencyChanged",
			setReduced,
		);
		return () => {
			active = false;
			subscription.remove();
		};
	}, []);

	return reduced;
}
