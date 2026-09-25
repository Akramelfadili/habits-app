import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";
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
			hitSlop={8}
			style={({ pressed }) => [
				styles.base,
				checked
					? { backgroundColor: colors.ink }
					: {
							backgroundColor: "transparent",
							borderWidth: 1.5,
							borderColor: colors.border,
						},
				pressed && { opacity: opacity.pressed },
			]}
		>
			{checked ? (
				<SymbolView name="checkmark" size={14} tintColor={colors.onAccent} />
			) : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	base: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
});
