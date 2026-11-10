import { useColorScheme } from "react-native";
import {
	elevation,
	interactionOpacity,
	semanticColors,
	surfaceColors,
	typeScale,
} from "./theme";
import {
	resolveScheme,
	useThemePreferenceStore,
} from "./theme-preference-store";

/**
 * The active tokens. The scheme is the Appearance setting resolved against the OS: an
 * explicit Light/Dark wins, "system" follows iOS.
 */
export function useTheme() {
	const preference = useThemePreferenceStore((state) => state.preference);
	const systemScheme = useColorScheme();
	const scheme = resolveScheme(preference, systemScheme);

	return {
		scheme,
		colors: { ...surfaceColors[scheme], ...semanticColors[scheme] },
		type: typeScale,
		elevation: elevation[scheme],
		opacity: interactionOpacity,
	};
}
