import { format } from "date-fns";
import { useRef } from "react";
import { StyleSheet, Text, View, type ViewInstance } from "react-native";
import {
	HeaderAddButton,
	HeaderMenuButton,
} from "@/components/ui/primitives/header-menu-button";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type TodayHeaderProps = {
	today: Date;
	menuOpen: boolean;
	onToggleMenu: () => void;
	/** Opens New habit — the `+` beside the menu button. */
	onAddHabit: () => void;
	/** The button's bottom edge in window space, reported on press for placing the popover. */
	onAnchorMeasured: (anchorBottom: number) => void;
};

/** Date eyebrow + "Today" title with the `+` and `⋯` buttons — identical in all four Today states (HAB-14). */
export function TodayHeader({
	today,
	menuOpen,
	onToggleMenu,
	onAddHabit,
	onAnchorMeasured,
}: TodayHeaderProps) {
	const { colors } = useTheme();
	const button = useRef<ViewInstance>(null);
	const measuring = useRef(false);

	function handlePress() {
		if (menuOpen || !button.current) {
			onToggleMenu();
			return;
		}
		if (measuring.current) return;
		// Measured per press (the header scrolls with Today's content), and
		// *before* opening, so the menu mounts once at its final position.
		measuring.current = true;
		button.current.measureInWindow((_x, y, _width, height) => {
			measuring.current = false;
			onAnchorMeasured(y + height);
			onToggleMenu();
		});
	}

	return (
		<View style={styles.header}>
			<SectionLabel>{format(today, "EEEE, d MMMM")}</SectionLabel>
			<View style={styles.titleRow}>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					Today
				</Text>
				<View style={styles.buttons}>
					<HeaderAddButton
						accessibilityLabel="Add habit"
						onPress={onAddHabit}
					/>
					<HeaderMenuButton
						ref={button}
						open={menuOpen}
						onPress={handlePress}
					/>
				</View>
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
	buttons: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
});
