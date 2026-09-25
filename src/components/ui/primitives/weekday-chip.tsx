import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/use-theme";

type WeekdayChipProps = {
	/** Single-letter label ("M", "T", …). */
	letter: string;
	/** Full day name, for screen readers — letters alone are ambiguous (T/T, S/S). */
	accessibilityLabel: string;
	selected: boolean;
	onPress: () => void;
	disabled?: boolean;
};

/** 36px day circle — filled when selected. */
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
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ selected, disabled }}
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [
				styles.circle,
				{ backgroundColor: selected ? colors.ink : colors.inner },
				disabled && { opacity: opacity.disabled },
				pressed && !disabled && { opacity: opacity.pressed },
			]}
		>
			<Text
				style={[
					styles.letter,
					{ color: selected ? colors.onAccent : colors.sub },
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
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	letter: {
		fontSize: 13,
		fontWeight: "500",
	},
});
