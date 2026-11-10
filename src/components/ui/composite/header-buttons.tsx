import type { NativeStackNavigationOptions } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import {
	barMaxFontMultiplier,
	iconSize,
	radius,
	space,
	textStyles,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

// On iOS 26 every native nav-bar item is wrapped in a shared Liquid Glass capsule unless it sets
// `hidesSharedBackground`. A plain `headerRight` can't carry that flag and the system back button
// can't opt out, so header buttons are custom items (iOS-only) plus the same element via
// `headerLeft`/`headerRight` for web/Android. Costs the system long-press back menu; swipe-back is unaffected.

const PLUS_SIZE = 16;
const PLUS_STROKE = 2;

export const HEADER_BUTTON_MIN_SIZE = 44;

const COMPACT_PILL_HEIGHT = 36;
const COMPACT_PILL_SLOP = { top: 4, bottom: 4 };

type HeaderButtonProps = {
	label: string;
	onPress: () => void;
	variant: "back" | "action";
	accessibilityLabel?: string;
};

function HeaderButton({
	label,
	onPress,
	variant,
	accessibilityLabel,
}: HeaderButtonProps) {
	const { colors, opacity } = useTheme();
	const color = variant === "back" ? colors.ink : colors.faint;

	return (
		<Pressable
			testID={`header-button-${variant}`}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? label}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				variant === "back" && styles.back,
				pressed && { opacity: opacity.pressed },
			]}
		>
			{variant === "back" ? (
				<SymbolView name="chevron.left" size={17} tintColor={color} />
			) : null}
			{label ? (
				<Text
					style={[
						variant === "back" ? styles.backLabel : styles.actionLabel,
						{ color },
					]}
				>
					{label}
				</Text>
			) : null}
		</Pressable>
	);
}

type HeaderButtonOptions = Pick<
	NativeStackNavigationOptions,
	| "headerBackVisible"
	| "headerLeft"
	| "headerRight"
	| "unstable_headerLeftItems"
	| "unstable_headerRightItems"
>;

// `onPress` should be the standard back action so `beforeRemove` listeners still fire.
export function headerBackOptions({
	title,
	onPress,
}: {
	title: string;
	onPress: () => void;
}): HeaderButtonOptions {
	const element = (
		<HeaderButton
			variant="back"
			label={title}
			accessibilityLabel={title ? `Back to ${title}` : "Back"}
			onPress={onPress}
		/>
	);
	// Nothing to show after a deep link straight into a pushed screen, like the system button.
	return {
		headerBackVisible: false,
		headerLeft: ({ canGoBack }) => (canGoBack ? element : null),
		unstable_headerLeftItems: ({ canGoBack }) =>
			canGoBack
				? [{ type: "custom", element, hidesSharedBackground: true }]
				: [],
	};
}

export function headerActionOptions({
	label,
	onPress,
	accessibilityLabel,
}: {
	label: string;
	onPress: () => void;
	accessibilityLabel?: string;
}): HeaderButtonOptions {
	const element = (
		<HeaderButton
			variant="action"
			label={label}
			accessibilityLabel={accessibilityLabel}
			onPress={onPress}
		/>
	);
	return {
		headerRight: () => element,
		unstable_headerRightItems: () => [
			{ type: "custom", element, hidesSharedBackground: true },
		],
	};
}

type HeaderCircleButtonProps = {
	symbol: SFSymbol;
	accessibilityLabel: string;
	onPress: () => void;
};

export function HeaderCircleButton({
	symbol,
	accessibilityLabel,
	onPress,
}: HeaderCircleButtonProps) {
	const { colors, opacity } = useTheme();

	return (
		<Pressable
			testID={`header-circle-${symbol}`}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			onPress={onPress}
			style={({ pressed }) => [
				styles.circle,
				{ backgroundColor: colors.card, borderColor: colors.border },
				pressed && { opacity: opacity.pressed },
			]}
		>
			{symbol === "plus" ? (
				<PlusGlyph color={colors.ink} />
			) : (
				<SymbolView name={symbol} size={iconSize.l} tintColor={colors.ink} />
			)}
		</Pressable>
	);
}

type HeaderPillButtonProps = {
	label: string;
	symbol?: SFSymbol;
	accessibilityLabel?: string;
	// Reads as disabled but still takes the tap, so Export can explain in a toast why it can't run.
	unavailable?: boolean;
	// 36 pt drawn with a 44 pt hit area: a full 44 pt pill would touch the inline bar's edges.
	compact?: boolean;
	onPress: () => void;
};

export function HeaderPillButton({
	label,
	symbol,
	accessibilityLabel,
	unavailable = false,
	compact = false,
	onPress,
}: HeaderPillButtonProps) {
	const { colors, opacity } = useTheme();

	return (
		<Pressable
			testID="header-pill"
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityState={{ disabled: unavailable }}
			onPress={onPress}
			hitSlop={compact ? COMPACT_PILL_SLOP : undefined}
			style={({ pressed }) => [
				styles.pill,
				compact && styles.pillCompact,
				{ backgroundColor: colors.card, borderColor: colors.border },
				unavailable && { opacity: opacity.disabled },
				pressed && { opacity: opacity.pressed },
			]}
		>
			{symbol ? (
				<SymbolView name={symbol} size={iconSize.m} tintColor={colors.ink} />
			) : null}
			<Text
				maxFontSizeMultiplier={barMaxFontMultiplier}
				style={[styles.pillLabel, { color: colors.ink }]}
			>
				{label}
			</Text>
		</Pressable>
	);
}

// Drawn from two bars: an SF Symbol renders nothing on web, which left the header circles blank in the web baselines.
function PlusGlyph({ color }: { color: string }) {
	return (
		<View style={styles.plus} testID="header-circle-plus-glyph">
			<View
				style={[
					styles.plusBar,
					styles.plusHorizontal,
					{ backgroundColor: color },
				]}
			/>
			<View
				style={[
					styles.plusBar,
					styles.plusVertical,
					{ backgroundColor: color },
				]}
			/>
		</View>
	);
}

export function headerNoBackOptions(): HeaderButtonOptions {
	return {
		headerBackVisible: false,
		headerLeft: () => null,
		unstable_headerLeftItems: () => [],
	};
}

const styles = StyleSheet.create({
	button: {
		minWidth: HEADER_BUTTON_MIN_SIZE,
		minHeight: HEADER_BUTTON_MIN_SIZE,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space[100],
		paddingHorizontal: space[500],
	},
	back: {
		justifyContent: "flex-start",
		paddingHorizontal: space[150],
	},
	circle: {
		width: HEADER_BUTTON_MIN_SIZE,
		height: HEADER_BUTTON_MIN_SIZE,
		borderRadius: radius.pill,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	pill: {
		minHeight: HEADER_BUTTON_MIN_SIZE,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space[150],
		paddingHorizontal: space[400],
		borderRadius: radius.pill,
		borderWidth: 1,
	},
	pillCompact: {
		minHeight: COMPACT_PILL_HEIGHT,
	},
	pillLabel: {
		...textStyles.subhead,
	},
	plus: {
		width: PLUS_SIZE,
		height: PLUS_SIZE,
		alignItems: "center",
		justifyContent: "center",
	},
	plusBar: {
		position: "absolute",
		borderRadius: PLUS_STROKE / 2,
	},
	plusHorizontal: {
		width: PLUS_SIZE,
		height: PLUS_STROKE,
	},
	plusVertical: {
		width: PLUS_STROKE,
		height: PLUS_SIZE,
	},
	backLabel: {
		fontSize: 17,
	},
	actionLabel: {
		fontSize: 15,
		fontWeight: "500",
	},
});
