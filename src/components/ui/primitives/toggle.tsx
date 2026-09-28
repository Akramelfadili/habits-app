import { Switch, View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type ToggleProps = {
	value: boolean;
	onValueChange: (value: boolean) => void;
	/** Screen-reader name — a bare switch says nothing about what it controls. */
	accessibilityLabel: string;
	disabled?: boolean;
};

/**
 * Binary on/off switch — ink track when on, `track` grey when off, faded
 * when disabled (design-system.md's Toggle). Wraps the native switch so it
 * keeps the platform's feel and accessibility.
 */
export function Toggle({
	value,
	onValueChange,
	accessibilityLabel,
	disabled = false,
}: ToggleProps) {
	const { colors, opacity } = useTheme();

	return (
		<View style={disabled ? { opacity: opacity.disabled } : undefined}>
			<Switch
				value={value}
				onValueChange={onValueChange}
				disabled={disabled}
				accessibilityLabel={accessibilityLabel}
				trackColor={{ false: colors.track, true: colors.ink }}
				ios_backgroundColor={colors.track}
				thumbColor={value ? colors.onAccent : colors.card}
			/>
		</View>
	);
}
