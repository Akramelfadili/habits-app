import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { useTheme } from "@/theme/use-theme";

type IconBadgeProps = {
	symbol: SFSymbol;
	/** Accent tint + ink for a habit's icon; omit for the neutral grey badge (form rows). */
	accent?: { tint: string; ink: string };
	/**
	 * "large" is a sheet header's own icon (e.g. Quantity Log, HAB-07);
	 * "small" is the 22px inline badge (VAR-02) — the category picker's header.
	 */
	size?: "small" | "default" | "large";
};

/** Non-interactive leading icon square for list rows (design-system "List row"). */
export function IconBadge({
	symbol,
	accent,
	size = "default",
}: IconBadgeProps) {
	const { colors } = useTheme();
	return (
		<View
			style={[
				BADGE_STYLES[size],
				{ backgroundColor: accent?.tint ?? colors.inner },
			]}
		>
			<SymbolView
				name={symbol}
				size={SYMBOL_SIZES[size]}
				tintColor={accent?.ink ?? colors.sub}
			/>
		</View>
	);
}

const SYMBOL_SIZES = { small: 11, default: 16, large: 24 } as const;

const styles = StyleSheet.create({
	badgeSmall: {
		width: 22,
		height: 22,
		borderRadius: 7,
		alignItems: "center",
		justifyContent: "center",
	},
	badge: {
		width: 32,
		height: 32,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	badgeLarge: {
		width: 48,
		height: 48,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
});

const BADGE_STYLES = {
	small: styles.badgeSmall,
	default: styles.badge,
	large: styles.badgeLarge,
} as const;
