import { Pressable, StyleSheet, Text, View } from "react-native";
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

/** 36px day circle — filled when selected — in a 44pt-tall touch column. */
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
				styles.touch,
				disabled && { opacity: opacity.disabled },
				pressed && !disabled && { opacity: opacity.pressed },
			]}
		>
			<View
				style={[
					styles.circle,
					{ backgroundColor: selected ? colors.ink : colors.inner },
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
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	// Each chip owns an equal column (flex 1) at least 44pt tall: the touch
	// areas abut, never overlap, and the 36pt circle sits centred in its own.
	touch: {
		flex: 1,
		minHeight: 44,
		alignItems: "center",
		justifyContent: "center",
	},
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
