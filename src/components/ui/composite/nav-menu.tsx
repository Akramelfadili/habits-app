import { type PropsWithChildren, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useTheme } from "@/theme/use-theme";
import { SectionLabel } from "../primitives/section-label";

type NavMenuProps = PropsWithChildren<{
	/** Window-space Y of the bottom of the button that opened it — the popover hangs just below. */
	anchorBottom: number;
	/** Eyebrow over the first group of rows. */
	label: string;
	onClose: () => void;
}>;

const GAP_BELOW_ANCHOR = 8;
const SIDE_MARGIN = 16;
const MAX_WIDTH = 300;

/**
 * Anchored popover menu over a dim scrim (NEW-02). Rendered inside the screen,
 * not a Modal, so the button that opened it stays tappable above the scrim —
 * tapping it again closes the menu. Mount it only while open.
 *
 * Children are the rows; put a `NavMenuDivider` between groups.
 */
export function NavMenu({
	anchorBottom,
	label,
	onClose,
	children,
}: NavMenuProps) {
	const { colors } = useTheme();
	const { width } = useWindowDimensions();
	const overlay = useRef<View>(null);
	const [top, setTop] = useState(anchorBottom + GAP_BELOW_ANCHOR);

	// The anchor is in window space; the overlay may start below the status bar.
	// Re-run when the anchor arrives (the caller measures it after opening).
	useEffect(placeBelowAnchor, [anchorBottom]);
	function placeBelowAnchor() {
		overlay.current?.measureInWindow?.((_x, y) =>
			setTop(anchorBottom - y + GAP_BELOW_ANCHOR),
		);
	}

	return (
		<View
			ref={overlay}
			collapsable={false}
			onLayout={placeBelowAnchor}
			style={StyleSheet.absoluteFill}
			accessibilityViewIsModal
		>
			<Pressable
				style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
				onPress={onClose}
				accessibilityRole="button"
				accessibilityLabel="Close menu"
			/>
			<View
				style={[
					styles.popover,
					{
						top,
						width: Math.min(MAX_WIDTH, width - SIDE_MARGIN * 2),
						backgroundColor: colors.card,
					},
				]}
			>
				<View style={styles.label}>
					<SectionLabel>{label}</SectionLabel>
				</View>
				{children}
			</View>
		</View>
	);
}

/** The hairline between a menu's groups. */
export function NavMenuDivider() {
	const { colors } = useTheme();
	return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
	popover: {
		position: "absolute",
		right: SIDE_MARGIN,
		borderRadius: 18,
		paddingVertical: 8,
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: 8 },
		elevation: 8,
	},
	label: {
		paddingHorizontal: 12,
		paddingTop: 4,
		paddingBottom: 4,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginVertical: 4,
		marginHorizontal: 12,
	},
});
