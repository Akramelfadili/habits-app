import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { radius, squareRadius } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type IconBadgeProps = {
	/** Omit only with `minusColor`. */
	symbol?: SFSymbol;
	/** Draws a minus bar in this colour instead of a symbol: no SF Symbol is a bare minus (Delete habit). */
	minusColor?: string;
	accent?: { tint: string; ink: string };
	/**
	 * "large" is a sheet header's own icon (e.g. Quantity Log); "small" is the 22px inline badge (the
	 * category picker's header); "compact" the 28px habit badge on a summary's per-habit rows.
	 */
	size?: "small" | "compact" | "default" | "large";
};

export function IconBadge({
	symbol,
	minusColor,
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
			{minusColor ? (
				<View
					testID="icon-badge-minus"
					style={[minusStyles.minus, { backgroundColor: minusColor }]}
				/>
			) : symbol ? (
				<SymbolView
					name={symbol}
					size={SYMBOL_SIZES[size]}
					tintColor={accent?.ink ?? colors.sub}
				/>
			) : null}
		</View>
	);
}

const SYMBOL_SIZES = {
	small: 11,
	compact: 14,
	default: 16,
	large: 24,
} as const;

const SQUARE_SIZES = {
	small: 22,
	compact: 28,
	default: 32,
	large: 48,
} as const;

/** The radius follows round(size × 0.31), so every size is one rule. */
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

const minusStyles = StyleSheet.create({
	minus: { width: 12, height: 2, borderRadius: radius.xs },
});
