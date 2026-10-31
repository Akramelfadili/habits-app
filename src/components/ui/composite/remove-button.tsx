import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { minTouchTarget, radius, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type RemoveButtonProps = {
	/** Names what goes ("Remove reminder at 18:30") — the glyph alone says nothing. */
	accessibilityLabel: string;
	onPress: () => void;
	disabled?: boolean;
};

const DISC = space[600];

/**
 * V3-23 "remove": the red minus disc on the left of a list row — a 44 pt
 * target around a 24 pt disc. The minus is the second signal beside the
 * colour. Removal is instant and reversible, so it asks nothing.
 */
export function RemoveButton({
	accessibilityLabel,
	onPress,
	disabled = false,
}: RemoveButtonProps) {
	const { colors, opacity } = useTheme();
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.target,
				disabled && { opacity: opacity.disabled },
				pressed && !disabled && { opacity: opacity.pressed },
			]}
		>
			<View style={[styles.disc, { backgroundColor: colors.dangerBg }]}>
				<SymbolView name="minus" size={12} tintColor={colors.onAccent} />
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	target: {
		width: minTouchTarget,
		height: minTouchTarget,
		alignItems: "center",
		justifyContent: "center",
	},
	disc: {
		width: DISC,
		height: DISC,
		borderRadius: radius.pill,
		alignItems: "center",
		justifyContent: "center",
	},
});
