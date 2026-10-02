import { format } from "date-fns";
import { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { HeaderMenuButton } from "@/components/ui/primitives/header-menu-button";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type TodayHeaderProps = {
	today: Date;
	menuOpen: boolean;
	onToggleMenu: () => void;
	/** The button's bottom edge in window space, reported on press for placing the popover. */
	onAnchorMeasured: (anchorBottom: number) => void;
};

/** Date eyebrow + "Today" title with the `⋯` menu button — identical in all four Today states (HAB-14). */
export function TodayHeader({
	today,
	menuOpen,
	onToggleMenu,
	onAnchorMeasured,
}: TodayHeaderProps) {
	const { colors } = useTheme();
	const button = useRef<View>(null);

	function handlePress() {
		onToggleMenu();
		// Measured per press: the header scrolls with Today's content.
		button.current?.measureInWindow((_x, y, _width, height) =>
			onAnchorMeasured(y + height),
		);
	}

	return (
		<View style={styles.header}>
			<SectionLabel>{format(today, "EEEE, d MMMM")}</SectionLabel>
			<View style={styles.titleRow}>
				<Text style={[styles.title, { color: colors.ink }]}>Today</Text>
				<HeaderMenuButton ref={button} open={menuOpen} onPress={handlePress} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		gap: 4,
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
});
