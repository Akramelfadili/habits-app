import { Pressable, StyleSheet, Text } from "react-native";
import { minTouchTarget, radius, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type WeekdayChipProps = {
	letter: string;
	/** Full day name, for screen readers — letters alone are ambiguous (T/T, S/S). */
	accessibilityLabel: string;
	selected: boolean;
	onPress: () => void;
	disabled?: boolean;
};

/**
 * A 44 pt day circle (the touch target itself, so neighbours abut and never overlap). Off is the
 * card with a 3:1 outline; selected is the accent fill. The letter is the second signal, the checked
 * state the third.
 */
export function WeekdayChip({
	letter,
	accessibilityLabel,
	selected,
	onPress,
	disabled = false,
}: WeekdayChipProps) {
	const { colors, opacity } = useTheme();

	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ checked: selected, disabled }}
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [
				styles.circle,
				selected
					? { backgroundColor: colors.accent, borderColor: colors.accent }
					: { backgroundColor: colors.card, borderColor: colors.outline },
				disabled && { opacity: opacity.disabled },
				// Pressed: inner fill, not a fade.
				pressed && !disabled && !selected && { backgroundColor: colors.inner },
			]}
		>
			<Text
				style={[
					styles.letter,
					{ color: selected ? colors.onAccent : colors.ink },
					disabled && { color: colors.faint },
				]}
			>
				{letter}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	circle: {
		width: minTouchTarget,
		height: minTouchTarget,
		borderRadius: radius.pill,
		borderWidth: 1.5,
		alignItems: "center",
		justifyContent: "center",
	},
	letter: {
		...textStyles.subhead,
	},
});
