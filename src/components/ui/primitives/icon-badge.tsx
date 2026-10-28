import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { squareRadius } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type IconBadgeProps = {
	symbol: SFSymbol;
	/** Accent tint + ink for a habit's icon; omit for the neutral grey badge (form rows). */
	accent?: { tint: string; ink: string };
	/**
	 * "large" is a sheet header's own icon (e.g. Quantity Log, HAB-07);
	 * "small" is the 22px inline badge (VAR-02) — the category picker's header;
	 * "compact" the 28px habit badge on a summary's per-habit rows (NEW-21).
	 */
	size?: "small" | "compact" | "default" | "large";
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

const SYMBOL_SIZES = {
	small: 11,
	compact: 14,
	default: 16,
	large: 24,
} as const;

/** Square sizes in pt; "default" is V3-32's 32 pt row square (T-18, was 38). */
const SQUARE_SIZES = {
	small: 22,
	compact: 28,
	default: 32,
	large: 48,
} as const;

/** V3-32: the radius follows round(size × 0.31) (F-05), so every size is one rule. */
const styles = StyleSheet.create(
	Object.fromEntries(
		Object.entries(SQUARE_SIZES).map(([size, side]) => [
			size,
			{
				width: side,
				height: side,
				borderRadius: squareRadius(side),
				alignItems: "center" as const,
				justifyContent: "center" as const,
			},
		]),
	),
);

const BADGE_STYLES = styles;
