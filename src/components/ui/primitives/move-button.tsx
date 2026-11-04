import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text } from "react-native";
import { minTouchTarget } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type MoveButtonProps = {
	direction: "up" | "down";
	/** What a screen reader says: "Move Meditate up". */
	accessibilityLabel: string;
	/** At the first or last place of its group there is nowhere to go. */
	disabled?: boolean;
	onPress: () => void;
};

/**
 * One step up or down in a reorder list: the plain-tap way to move a row, next
 * to the drag grip. 44 × 44 pt; dimmed and inert at the end of its group.
 */
export function MoveButton({
	direction,
	accessibilityLabel,
	disabled = false,
	onPress,
}: MoveButtonProps) {
	const { colors, opacity } = useTheme();
	const tint = disabled ? colors.faint : colors.ink;

	return (
		<Pressable
			testID={`move-${direction}`}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.base,
				pressed && !disabled && { opacity: opacity.pressed },
			]}
		>
			<SymbolView
				name={direction === "up" ? "chevron.up" : "chevron.down"}
				size={16}
				tintColor={tint}
				fallback={
					<Text style={{ color: tint }}>{direction === "up" ? "↑" : "↓"}</Text>
				}
			/>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	base: {
		width: minTouchTarget,
		height: minTouchTarget,
		alignItems: "center",
		justifyContent: "center",
	},
});
