import { useWindowDimensions } from "react-native";
import { forcedAccessibilityTextSize } from "@/lib/dev-text-size/forced-text-size";

/**
 * Where iOS's accessibility text sizes begin, as a font scale. The standard
 * Dynamic Type sizes top out at xxxLarge (1.35); the first accessibility size,
 * AX1, is 1.65, and AX3 — the size the mockup redraws every layout at — is
 * 2.35. 1.5 sits in the gap, so no standard size ever trips it.
 */
export const AX_FONT_SCALE = 1.5;

/**
 * True at Dynamic Type AX1 and above, where layouts that only work at standard sizes give way to
 * their accessibility variants: today the floating tab-bar pill, which falls back to the
 * full-width bar.
 *
 * Reads `useWindowDimensions().fontScale`, so it follows the setting live rather than only at
 * launch. On web that value is always 1 (react-native-web does not implement it), so a dev-only
 * `?textSize=ax` stands in; see `lib/dev-text-size/`.
 */
export function useAccessibilityTextSize(): boolean {
	const { fontScale } = useWindowDimensions();
	return forcedAccessibilityTextSize() || fontScale >= AX_FONT_SCALE;
}
