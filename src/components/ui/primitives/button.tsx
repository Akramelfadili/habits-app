import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/use-theme";

/**
 * `link` is a centered, secondary-ink text action under a primary CTA ("Start
 * from scratch"); `inline` is an ink text action that sits flush-left inside a
 * card's content (Weekly Summary's "Reschedule habit →").
 */
export type ButtonVariant =
	| "primary"
	| "secondary"
	| "ghost"
	| "link"
	| "inline";

type ButtonProps = {
	label: string;
	onPress: () => void;
	variant?: ButtonVariant;
	disabled?: boolean;
	loading?: boolean;
	fullWidth?: boolean;
};

export function Button({
	label,
	onPress,
	variant = "primary",
	disabled = false,
	loading = false,
	fullWidth = true,
}: ButtonProps) {
	const { colors, opacity } = useTheme();
	const isDisabled = disabled || loading;
	const textColor =
		variant === "primary"
			? colors.onAccent
			: variant === "ghost"
				? colors.faint
				: variant === "link"
					? colors.sub
					: colors.ink;

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled: isDisabled, busy: loading }}
			onPress={onPress}
			disabled={isDisabled}
			hitSlop={fullWidth ? undefined : 8}
			style={({ pressed }) => [
				styles.base,
				fullWidth ? styles.fullWidth : styles.compact,
				variant === "primary" && { backgroundColor: colors.ink },
				variant === "secondary" && {
					backgroundColor: colors.card,
					borderWidth: 1,
					borderColor: colors.border,
				},
				variant === "ghost" && { backgroundColor: "transparent" },
				(variant === "link" || variant === "inline") && styles.link,
				variant === "inline" && styles.inline,
				isDisabled && { opacity: opacity.disabled },
				pressed && !isDisabled && { opacity: opacity.pressed },
			]}
		>
			{loading ? (
				<ActivityIndicator color={textColor} />
			) : (
				<Text
					style={[
						styles.label,
						variant === "inline" && styles.inlineLabel,
						{ color: textColor },
					]}
				>
					{label}
				</Text>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	base: {
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
	},
	fullWidth: {
		width: "100%",
		paddingVertical: 14,
	},
	compact: {
		paddingVertical: 10,
		paddingHorizontal: 20,
	},
	link: {
		backgroundColor: "transparent",
		paddingVertical: 4,
		paddingHorizontal: 0,
	},
	inline: {
		alignSelf: "flex-start",
	},
	label: {
		fontSize: 15,
		fontWeight: "500",
	},
	inlineLabel: {
		fontWeight: "600",
	},
});
