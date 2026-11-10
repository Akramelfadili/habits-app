import { useWindowDimensions } from "react-native";
import { forcedAccessibilityTextSize } from "@/lib/dev-text-size/forced-text-size";

// Standard Dynamic Type tops out at xxxLarge (1.35) and AX1 is 1.65; 1.5 sits in the gap so no standard size trips it.
export const AX_FONT_SCALE = 1.5;

// On web `fontScale` is always 1 (react-native-web doesn't implement it), so a dev-only `?textSize=ax` stands in.
export function useAccessibilityTextSize(): boolean {
	const { fontScale } = useWindowDimensions();
	return forcedAccessibilityTextSize() || fontScale >= AX_FONT_SCALE;
}
