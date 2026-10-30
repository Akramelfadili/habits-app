import { Pressable, StyleSheet, Text, View } from "react-native";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type ChipProps = {
	label: string;
	onPress: () => void;
	selected?: boolean;
	/** "outline" is the shortcut style (e.g. "Weekdays shortcut") — an action, not a filter. */
	variant?: "filter" | "outline";
	disabled?: boolean;
};

/** Pill for filter/mode choices (frequency, category, quick-add). */
export function Chip({
	label,
	onPress,
	selected = false,
	variant = "filter",
	disabled = false,
}: ChipProps) {
	const { colors, opacity } = useTheme();
	const isOutline = variant === "outline";

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected, disabled }}
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
					styles.chip,
					{ backgroundColor: colors.card, borderColor: colors.border },
					isOutline && {
						backgroundColor: "transparent",
						borderColor: colors.ink,
					},
					selected && { backgroundColor: colors.accent },
				]}
			>
				<Text
					style={[
						styles.label,
						{ color: selected ? colors.onAccent : colors.ink },
						disabled && { color: colors.faint },
					]}
				>
					{label}
				</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	// The pill is unchanged; its touch area is 44pt tall.
	touch: {
		minHeight: minTouchTarget,
		justifyContent: "center",
	},
	chip: {
		borderRadius: radius.pill,
		borderWidth: 1,
		borderColor: "transparent",
		paddingVertical: space[200],
		paddingHorizontal: space[350],
	},
	label: {
		...textStyles.subhead,
	},
});
