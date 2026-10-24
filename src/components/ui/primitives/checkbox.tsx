import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type CheckboxProps = {
	checked: boolean;
	onPress: () => void;
	accessibilityLabel: string;
};

/** Checked (filled ink circle + checkmark) / unchecked (outline circle) — First Run's suggestion rows (HAB-06). */
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
						? { backgroundColor: colors.ink }
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

const styles = StyleSheet.create({
	// A 44pt touch area around the 24pt circle. The negative margin gives the
	// extra back, so the row lays out as before; it reaches only into the
	// host row's own padding (never a sibling), which is why this is not a
	// hitSlop — it can't spill over adjacent controls.
	touch: {
		width: 44,
		height: 44,
		margin: -10,
		alignItems: "center",
		justifyContent: "center",
	},
	base: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
});
