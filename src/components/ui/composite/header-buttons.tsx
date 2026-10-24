import type { NativeStackNavigationOptions } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/use-theme";

/**
 * The ONE place navigation-header buttons are defined — back, Cancel, Edit,
 * and any future Done/Save. A guard test (`header-buttons.guard.test.ts`)
 * fails if any other file sets a header button option directly.
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
		gap: 4,
		// Same inset as the ghost Button these actions used before.
		paddingHorizontal: 20,
	},
	back: {
		justifyContent: "flex-start",
		paddingHorizontal: 6,
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
