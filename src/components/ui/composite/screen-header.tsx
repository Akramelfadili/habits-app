import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";

type ScreenHeaderProps = {
	/** The caps line over the title ("10 built-in · 2 custom", "Upper body · Tue, Thu"). */
	eyebrow?: string;
	title: string;
	/** What VoiceOver says for the title block when the visible words alone are not enough. */
	accessibilityLabel?: string;
	/** Up to two trailing 44 pt buttons (`HeaderCircleButton`, `HeaderPillButton`). */
	children?: ReactNode;
};

/**
 * V3-02 for a pushed screen that draws its own title (Categories, Reminders,
 * Settings): an optional eyebrow, the display title and the trailing buttons
 * on one row. At accessibility sizes the buttons move above the title (H10).
 * Eyebrow and title are one VoiceOver stop.
 */
export function ScreenHeader({
	eyebrow,
	title,
	accessibilityLabel,
	children,
}: ScreenHeaderProps) {
	const { colors } = useTheme();
	const stacked = useAccessibilityTextSize();

	const block = (
		<View
			accessible
			accessibilityRole="header"
			accessibilityLabel={
				accessibilityLabel ?? (eyebrow ? `${title}, ${eyebrow}` : title)
			}
			style={styles.title}
		>
			{eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
			<Text style={[styles.display, { color: colors.ink }]}>{title}</Text>
		</View>
	);
	const buttons = children ? (
		<View style={styles.buttons}>{children}</View>
	) : null;

	return stacked ? (
		<View style={styles.stackedRoot}>
			{buttons}
			{block}
		</View>
	) : (
		<View style={styles.root}>
			{block}
			{buttons}
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: space[300],
	},
	stackedRoot: {
		gap: space[200],
	},
	title: {
		flex: 1,
		gap: space[50],
	},
	display: {
		...textStyles.display,
	},
	buttons: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[200],
	},
});
