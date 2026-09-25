import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { useTheme } from "@/theme/use-theme";

type IconSquareProps =
	| {
			variant: "icon";
			symbol: SFSymbol;
			/** The habit's current accent — a selected icon previews it (tint fill + ink glyph). */
			accent: { tint: string; ink: string };
			selected: boolean;
			onPress: () => void;
			accessibilityLabel: string;
	  }
	| {
			variant: "color";
			color: string;
			selected: boolean;
			onPress: () => void;
			accessibilityLabel: string;
	  };

/**
 * A selectable swatch — an icon glyph square (Icon picker) or a round flat color
 * fill (Color picker). Selected state is a dark ring in both variants.
 */
export function IconSquare(props: IconSquareProps) {
	const { colors, opacity } = useTheme();
	const { selected, onPress, accessibilityLabel } = props;
	const ring = {
		borderWidth: 2,
		borderColor: selected ? colors.ink : "transparent",
	};

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ selected }}
			onPress={onPress}
			style={({ pressed }) => [
				props.variant === "color" ? styles.circle : styles.square,
				ring,
				props.variant === "color"
					? { backgroundColor: props.color }
					: {
							backgroundColor: selected ? props.accent.tint : colors.inner,
						},
				pressed && { opacity: opacity.pressed },
			]}
		>
			{props.variant === "icon" ? (
				<SymbolView
					name={props.symbol}
					size={20}
					tintColor={selected ? props.accent.ink : colors.sub}
				/>
			) : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	square: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	circle: {
		width: 36,
		height: 36,
		borderRadius: 18,
	},
});
