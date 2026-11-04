import type { NativeStackNavigationOptions } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { barMaxFontMultiplier, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

/**
 * The ONE place header buttons are defined — the navigation-bar ones (back,
 * Cancel, Edit, any future Done/Save) and the circle buttons a screen draws in
 * its own large-title header (V3-02: ≤ 2 trailing 44 pt buttons — the `+` on
 * Today and Habits, the gear on Habits). A guard test
 * (`header-buttons.guard.test.ts`) fails if any other file sets a header
 * button option directly.
 *
 * Why: on iOS 26 every native nav-bar item is wrapped in a shared Liquid Glass
 * capsule unless the item sets `hidesSharedBackground`. A plain `headerRight`
 * element can't carry that flag, and the system back button can't be opted
 * out at all — so header buttons here are custom items with
 * `hidesSharedBackground: true` (`unstable_header*Items`, iOS-only), plus the
 * same element via `headerLeft`/`headerRight` for web/Android, which the
 * items override on iOS. Liquid Glass stays on everywhere else (tab bar etc.).
 *
 * The back button is ours too (the system one is hidden), at the cost of the
 * system long-press back menu. Swipe-back is unaffected: react-native-screens
 * owns that gesture, independent of which button is showing.
 */

/** The drawn `+`: 16 pt across, 2 pt stroke (F-08). */
const PLUS_SIZE = 16;
const PLUS_STROKE = 2;

/** Minimum tap target, per the HIG. */
export const HEADER_BUTTON_MIN_SIZE = 44;

type HeaderButtonProps = {
	label: string;
	onPress: () => void;
	/** "back" leads with a chevron and reads in ink; "action" is a quiet text action. */
	variant: "back" | "action";
	accessibilityLabel?: string;
};

/** A plain text header button — no capsule, no shadow, at least 44×44. */
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

/**
 * A plain back button reading the previous screen's title ("‹ Today").
 * `onPress` should be `navigation.goBack()` / `router.back()` — the standard
 * back action, so anything listening for it (a future `beforeRemove` guard)
 * still fires.
 */
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
	// Like the system button it replaces: nothing to show when there's
	// nothing to go back to (a deep link straight into a pushed screen).
	return {
		headerBackVisible: false,
		headerLeft: ({ canGoBack }) => (canGoBack ? element : null),
		unstable_headerLeftItems: ({ canGoBack }) =>
			canGoBack
				? [{ type: "custom", element, hidesSharedBackground: true }]
				: [],
	};
}

/** A trailing text action — Cancel, Edit, Done, Save. */
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
	/** What it does — "Add habit", "Settings". Becomes the accessibility label. */
	accessibilityLabel: string;
	onPress: () => void;
};

/**
 * A trailing button in a screen's own large-title header (V3-02): a 44 pt
 * card-coloured circle with a hairline, so a pair of them reads as one group.
 * Not a navigation-bar item — those are the `*Options` helpers above.
 */
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
				<SymbolView name={symbol} size={18} tintColor={colors.ink} />
			)}
		</Pressable>
	);
}

type HeaderPillButtonProps = {
	label: string;
	/** A glyph before the label (Progress's Export arrow). */
	symbol?: SFSymbol;
	/** What it does, when the visible label alone is ambiguous — "Export data". */
	accessibilityLabel?: string;
	/**
	 * Looks and reads as disabled, but still takes the tap: Progress's Export
	 * explains why it can't run in a toast (P3) instead of going silent.
	 */
	unavailable?: boolean;
	onPress: () => void;
};

/**
 * A labelled trailing button in a screen's own large-title header (Progress's
 * Export, P1): the same 44 pt-high card pill with a hairline as the circles,
 * with its words beside the glyph.
 */
export function HeaderPillButton({
	label,
	symbol,
	accessibilityLabel,
	unavailable = false,
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
			style={({ pressed }) => [
				styles.pill,
				{ backgroundColor: colors.card, borderColor: colors.border },
				unavailable && { opacity: opacity.disabled },
				pressed && { opacity: opacity.pressed },
			]}
		>
			{symbol ? (
				<SymbolView name={symbol} size={16} tintColor={colors.ink} />
			) : null}
			<Text
				// A 44 pt control holds its size: Dynamic Type may grow the label only so far.
				maxFontSizeMultiplier={barMaxFontMultiplier}
				style={[styles.pillLabel, { color: colors.ink }]}
			>
				{label}
			</Text>
		</Pressable>
	);
}

/**
 * The `+`, drawn from two bars: an SF Symbol renders nothing on web, which left
 * Today's and Habits' header circles blank in the web baselines. Same on every
 * platform, so the glyph never differs between a phone and a visual check.
 */
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

/** No leading button at all — a modal form leaves only through its Cancel. */
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
		// Same inset as the ghost Button these actions used before.
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
	/** Matches the system back title it replaces. */
	backLabel: {
		fontSize: 17,
	},
	/** Same text as the ghost Button these actions used before. */
	actionLabel: {
		fontSize: 15,
		fontWeight: "500",
	},
});
