import { SymbolView } from "expo-symbols";
import { forwardRef } from "react";
import { Pressable, StyleSheet, type View } from "react-native";
import { useTheme } from "@/theme/use-theme";

type HeaderMenuButtonProps = {
	/** The menu it controls is showing — the button inverts to ink. */
	open: boolean;
	onPress: () => void;
};

/** Size of the circle; also the minimum tap target (HIG 44pt). */
export const HEADER_MENU_BUTTON_SIZE = 44;

/**
 * The `⋯` that opens a screen's navigation menu (NEW-01). Rest: a card-coloured
 * circle with a hairline. Open: filled ink with an inverted glyph.
 */
export const HeaderMenuButton = forwardRef<View, HeaderMenuButtonProps>(
	function HeaderMenuButton({ open, onPress }, ref) {
		const { colors, opacity } = useTheme();

		return (
			<Pressable
				ref={ref}
				// A View wrapper-free measure target on web/native alike.
				collapsable={false}
				accessibilityRole="button"
				accessibilityLabel="More"
				accessibilityState={{ expanded: open }}
				onPress={onPress}
				style={({ pressed }) => [
					styles.button,
					{
						backgroundColor: open ? colors.ink : colors.card,
						borderColor: open ? colors.ink : colors.border,
					},
					pressed && { opacity: opacity.pressed },
				]}
			>
				<SymbolView
					name="ellipsis"
					size={18}
					tintColor={open ? colors.onAccent : colors.ink}
				/>
			</Pressable>
		);
	},
);

type HeaderAddButtonProps = {
	/** What it adds — "Add habit". Becomes the accessibility label. */
	accessibilityLabel: string;
	onPress: () => void;
};

/**
 * The `+` beside the `⋯` (Today's Add habit): the same 44pt card-coloured
 * circle with a hairline, so the two read as one pair.
 */
export function HeaderAddButton({
	accessibilityLabel,
	onPress,
}: HeaderAddButtonProps) {
	const { colors, opacity } = useTheme();

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				{ backgroundColor: colors.card, borderColor: colors.border },
				pressed && { opacity: opacity.pressed },
			]}
		>
			<SymbolView name="plus" size={18} tintColor={colors.ink} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		width: HEADER_MENU_BUTTON_SIZE,
		height: HEADER_MENU_BUTTON_SIZE,
		borderRadius: HEADER_MENU_BUTTON_SIZE / 2,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
});
