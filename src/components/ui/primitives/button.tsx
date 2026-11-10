import type { Ref } from "react";
import {
	ActivityIndicator,
	type HostInstance,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { FieldHelper } from "./field-helper";

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "compact"
	| "ghost"
	| "link"
	| "inline"
	| "rowAction"
	| "dangerLink"
	| "destructive";

type ButtonProps = {
	label: string;
	onPress: () => void;
	variant?: ButtonVariant;
	disabled?: boolean;
	loading?: boolean;
	fullWidth?: boolean;
	size?: "default" | "small";
	disabledReason?: string;
	accessibilityLabel?: string;
	accessibilityHint?: string;
	buttonRef?: Ref<HostInstance>;
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
	accessibilityLabel,
	accessibilityHint,
	buttonRef,
}: ButtonProps) {
	const { colors, opacity } = useTheme();
	const isDisabled = disabled || loading;
	const isCompact = variant === "compact";
	// A 20 pt radius at accessibility sizes: a pill would cut a two-line label.
	const largeText = useAccessibilityTextSize();
	const textColor =
		variant === "primary"
			? colors.onAccent
			: variant === "ghost"
				? colors.faint
				: variant === "link"
					? colors.sub
					: variant === "destructive" || variant === "dangerLink"
						? colors.dangerBg
						: colors.ink;

	const button = (
		<Pressable
			ref={buttonRef}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityHint={
				accessibilityHint ?? (disabled ? disabledReason : undefined)
			}
			accessibilityState={{ disabled: isDisabled, busy: loading }}
			onPress={onPress}
			disabled={isDisabled}
			hitSlop={fullWidth ? undefined : isCompact ? COMPACT_HIT_SLOP : 8}
			style={({ pressed }) => [
				styles.base,
				largeText && styles.baseLarge,
				fullWidth ? styles.fullWidth : styles.compact,
				(size === "small" || isCompact) && styles.small,
				isCompact && [styles.compactPill, { backgroundColor: colors.inner }],
				variant === "primary" && { backgroundColor: colors.accent },
				variant === "secondary" && {
					backgroundColor: colors.card,
					borderWidth: 1,
					borderColor: colors.border,
				},
				variant === "ghost" && { backgroundColor: "transparent" },
				variant === "destructive" && {
					backgroundColor: colors.card,
					borderWidth: 1,
					borderColor: colors.border,
				},
				(variant === "link" ||
					variant === "inline" ||
					variant === "rowAction" ||
					variant === "dangerLink") &&
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
						(size === "small" ||
							isCompact ||
							variant === "rowAction" ||
							variant === "dangerLink") &&
							styles.smallLabel,
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

const COMPACT_HIT_SLOP = 4;

const styles = StyleSheet.create({
	withReason: {
		gap: space[300],
	},
	base: {
		borderRadius: radius.pill,
		alignItems: "center",
		justifyContent: "center",
	},
	baseLarge: {
		borderRadius: radius.l,
	},
	fullWidth: {
		width: "100%",
		minHeight: minTouchTarget,
		paddingVertical: space[350],
	},
	compact: {
		minHeight: minTouchTarget,
		paddingVertical: space[250],
		paddingHorizontal: space[500],
	},
	compactPill: {
		minHeight: 36,
	},
	small: {
		minHeight: 0,
		paddingVertical: space[150],
		paddingHorizontal: space[350],
	},
	// Tall rather than padded with a hitSlop: stacked under a CTA or beside another link, a slop would overlap them.
	link: {
		backgroundColor: "transparent",
		paddingVertical: space[100],
		paddingHorizontal: 0,
		minHeight: minTouchTarget,
	},
	inline: {
		alignSelf: "flex-start",
	},
	label: {
		textAlign: "center",
		...textStyles.body,
		fontWeight: "500",
	},
	inlineLabel: {
		fontWeight: "600",
	},
	smallLabel: {
		...textStyles.subhead,
	},
});
