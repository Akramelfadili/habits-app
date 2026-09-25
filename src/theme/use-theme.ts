import {
	type ColorScheme,
	interactionOpacity,
	semanticColors,
	surfaceColors,
	typeScale,
} from "./theme";

// Forced to light for now — a manual dark-mode toggle is a future feature.
// The "dark" tokens above stay intact and unused until that toggle exists.
export function useTheme() {
	const scheme: ColorScheme = "light";

	return {
		scheme,
		colors: { ...surfaceColors[scheme], ...semanticColors[scheme] },
		type: typeScale,
		opacity: interactionOpacity,
	};
}
