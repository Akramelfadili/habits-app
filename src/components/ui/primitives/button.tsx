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

/**
 * `link` is a centered, secondary-ink text action under a primary CTA ("Start from scratch");
 * `inline` is an ink text action that sits flush-left inside a card's content (Weekly Summary's
 * "Reschedule habit →"); `destructive` is an outlined pill with red text for a permanent action,
 * never filled until armed and never the default focus; `rowAction` is a quiet ink text action
 * inside a row (a category's Rename) and `dangerLink` the same in red for a permanent one (its
 * Delete); `compact` is a 36 pt pill on the inset surface (a row's Restore) with the 44 pt hit area
 * the other compact buttons get from their hit slop.
 */
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
	/** "small" is a compact pill inside a list row (Manage & Archive's "Restore"). */
	size?: "default" | "small";
	/**
	 * Why the action is unavailable, shown as a helper line above the button, only while it is
	 * actually disabled.
	 */
	disabledReason?: string;
	/** When the visible label alone is ambiguous — e.g. a row's "Rename" → "Rename Music". */
	accessibilityLabel?: string;
	/** What the button does beyond its label; a disabled button reads its `disabledReason` here when none is given. */
	accessibilityHint?: string;
	/** The pressable itself, for a caller that moves the screen reader's focus onto it (`useInitialFocus`). */
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
	// At accessibility sizes the label wraps inside the button and the button grows, on a 20 pt radius
	// (a pill would cut a two-line label).
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

/** A compact pill is 36 pt tall; this much on each side makes its hit area 44. */
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
	// Text actions are 44pt tall (touch target), not padded out with a hitSlop
	// — stacked under a CTA or beside another link, a slop would overlap them.
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
