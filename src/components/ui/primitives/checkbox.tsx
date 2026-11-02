import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { cellRadius, minTouchTarget, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type CheckboxProps = {
	checked: boolean;
	onPress: () => void;
	accessibilityLabel: string;
};

/**
 * V3-21: a 24 pt square (radius rule) — checked is the accent fill with a
 * checkmark, unchecked the 3:1 outline. A square is a settings choice and a
 * circle is a habit done, so this is for multi-select only (suggestions, export).
 */
export function Checkbox({
	checked,
	onPress,
	accessibilityLabel,
}: CheckboxProps) {
	const { colors, opacity } = useTheme();

	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ checked }}
			onPress={onPress}
			style={({ pressed }) => [
				styles.touch,
				pressed && { opacity: opacity.pressed },
			]}
		>
			<View
				style={[
					styles.base,
					checked
						? { backgroundColor: colors.accent }
						: {
								backgroundColor: "transparent",
								borderWidth: 1.5,
								borderColor: colors.outline,
							},
				]}
			>
				{checked ? (
					<SymbolView name="checkmark" size={14} tintColor={colors.onAccent} />
				) : null}
			</View>
		</Pressable>
	);
}

const BOX = 24;

const styles = StyleSheet.create({
	// A 44pt touch area around the 24pt circle. The negative margin gives the
	// extra back, so the row lays out as before; it reaches only into the
	// host row's own padding (never a sibling), which is why this is not a
	// hitSlop — it can't spill over adjacent controls.
	touch: {
		width: minTouchTarget,
		height: minTouchTarget,
		margin: -space[250],
		alignItems: "center",
		justifyContent: "center",
	},
	base: {
		width: BOX,
		height: BOX,
		borderRadius: cellRadius(BOX),
		alignItems: "center",
		justifyContent: "center",
	},
});
