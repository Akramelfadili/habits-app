import { Pressable, StyleSheet, Text, View } from "react-native";
import { Toggle } from "@/components/ui/primitives/toggle";
import { minTouchTarget, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type ToggleRowProps = {
	title: string;
	/** Under the title — what the switch does, or the reason it is off. */
	subtitle?: string;
	value: boolean;
	onValueChange: (value: boolean) => void;
	disabled?: boolean;
	/** What VoiceOver reads; defaults to the title (and subtitle). */
	accessibilityLabel?: string;
};

/**
 * V3-20 "whole row toggles": the row is the switch (role, label and state on
 * the row), the track beside it is only drawn. At least 44 pt tall.
 */
export function ToggleRow({
	title,
	subtitle,
	value,
	onValueChange,
	disabled = false,
	accessibilityLabel,
}: ToggleRowProps) {
	const { colors, opacity } = useTheme();
	return (
		<Pressable
			accessibilityRole="switch"
			accessibilityLabel={
				accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)
			}
			accessibilityState={{ checked: value, disabled }}
			disabled={disabled}
			onPress={() => onValueChange(!value)}
			style={({ pressed }) => [
				styles.row,
				pressed && !disabled && { backgroundColor: colors.inner },
			]}
		>
			<View style={styles.text}>
				<Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
				{subtitle ? (
					<Text style={[styles.subtitle, { color: colors.sub }]}>
						{subtitle}
					</Text>
				) : null}
			</View>
			<View style={disabled ? { opacity: opacity.disabled } : undefined}>
				<Toggle
					decorative
					value={value}
					disabled={disabled}
					onValueChange={onValueChange}
					accessibilityLabel={title}
				/>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
		minHeight: minTouchTarget,
		paddingHorizontal: space[350],
		paddingVertical: space[250],
	},
	text: {
		flex: 1,
		gap: space[50],
	},
	title: {
		...textStyles.body,
	},
	subtitle: {
		...textStyles.footnote,
	},
});
