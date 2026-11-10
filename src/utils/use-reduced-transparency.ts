import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { log } from "@/lib/logger/logger";

// react-native-web doesn't implement `isReduceTransparencyEnabled` at all (the method is missing),
// so both the query and the subscription are feature-detected; false is the right default elsewhere.
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
			.catch((error) => {
				log.warn("a11y.reduce_transparency_read_failed", { error });
			});
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
