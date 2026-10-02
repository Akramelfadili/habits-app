import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useTheme } from "@/theme/use-theme";
import { FieldHelper } from "./field-helper";

/**
 * `link` is a centered, secondary-ink text action under a primary CTA ("Start
 * from scratch"); `inline` is an ink text action that sits flush-left inside a
 * card's content (Weekly Summary's "Reschedule habit →"); `destructive` is the
 * design system's text-only red link for a permanent action — always the
 * smallest option on screen, never a filled red button (Delete confirmation,
 * HAB-13).
 */
export type ButtonVariant =
	| "primary"
	| "secondary"
	| "ghost"
	| "link"
	| "inline"
	| "destructive";

type ButtonProps = {
	label: string;
	onPress: () => void;
	variant?: ButtonVariant;
	disabled?: boolean;
	loading?: boolean;
	fullWidth?: boolean;
	/** "small" is a compact pill inside a list row (Manage & Archive's "Restore", HAB-13). */
	size?: "default" | "small";
	/**
	 * VAR-13 "disabled with reason": why the action is unavailable, shown as a
	 * NEW-24 helper line above the button — only while it's actually disabled.
	 */
	disabledReason?: string;
};

export function Button({
	label,
	onPress,
	variant = "primary",
	disabled = false,
	loading = false,
	fullWidth = true,
	size = "default",
	disabledReason,
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
					: variant === "destructive"
						? colors.dangerBg
						: colors.ink;

	const button = (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled: isDisabled, busy: loading }}
			onPress={onPress}
			disabled={isDisabled}
			hitSlop={fullWidth ? undefined : 8}
			style={({ pressed }) => [
				styles.base,
				fullWidth ? styles.fullWidth : styles.compact,
				size === "small" && styles.small,
				variant === "primary" && { backgroundColor: colors.ink },
				variant === "secondary" && {
					backgroundColor: colors.card,
					borderWidth: 1,
					borderColor: colors.border,
				},
				variant === "ghost" && { backgroundColor: "transparent" },
				(variant === "link" ||
					variant === "inline" ||
					variant === "destructive") &&
					styles.link,
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
						variant === "destructive" && styles.destructiveLabel,
						size === "small" && styles.smallLabel,
						{ color: textColor },
					]}
				>
					{label}
				</Text>
			)}
		</Pressable>
	);

	if (!disabled || !disabledReason) return button;
	return (
		<View style={styles.withReason}>
			<FieldHelper align="center">{disabledReason}</FieldHelper>
			{button}
		</View>
	);
}

const styles = StyleSheet.create({
	withReason: {
		gap: 12,
	},
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
	small: {
		paddingVertical: 6,
		paddingHorizontal: 14,
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
	destructiveLabel: {
		fontSize: 13,
	},
	smallLabel: {
		fontSize: 13,
	},
});
