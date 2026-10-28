import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { HeaderPillButton } from "@/components/ui/composite/header-buttons";
import { Button } from "@/components/ui/primitives/button";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { progressCopy } from "../../messages";

type ProgressHeaderProps = {
	/** "Week of 19 October", "October 2026", "2026". */
	eyebrow: string;
	/** Export can't run yet (no habits, nothing logged): it says why when tapped. */
	exportUnavailable: boolean;
	onExport: () => void;
	/** A month opened from Year: the way back to it (P13). */
	back?: { label: string; onPress: () => void };
	/** Scroll-linked shrink and fade of the whole row, from `useCollapsingHeader`. */
	animatedStyle?: object;
	/** The inline bar has taken over: this row stops taking taps and leaves VoiceOver. */
	collapsed?: boolean;
};

/**
 * V3-02 for Progress: the range's eyebrow, the display title and a trailing
 * Export pill. At accessibility text sizes the button moves above the title
 * (08.6). Eyebrow and title are one VoiceOver stop: "Progress, heading. Week of
 * 19 October."
 */
export function ProgressHeader({
	eyebrow,
	exportUnavailable,
	onExport,
	back,
	animatedStyle,
	collapsed = false,
}: ProgressHeaderProps) {
	const { colors } = useTheme();
	const stacked = useAccessibilityTextSize();

	const title = (
		<View
			accessible
			accessibilityRole="header"
			accessibilityLabel={`${progressCopy.screenTitle}. ${eyebrow}`}
			style={styles.titleBlock}
		>
			<SectionLabel>{eyebrow}</SectionLabel>
			<Text style={[styles.title, { color: colors.ink }]}>
				{progressCopy.screenTitle}
			</Text>
		</View>
	);
	const exportButton = (
		<HeaderPillButton
			label={progressCopy.export}
			symbol="square.and.arrow.up"
			accessibilityLabel={progressCopy.exportLabel}
			unavailable={exportUnavailable}
			onPress={onExport}
		/>
	);

	return (
		<Animated.View
			pointerEvents={collapsed ? "none" : "auto"}
			accessibilityElementsHidden={collapsed}
			importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"}
			style={[styles.block, animatedStyle]}
		>
			{back ? (
				<View style={styles.back}>
					<Button
						label={progressCopy.backLabel(back.label)}
						accessibilityLabel={progressCopy.backToYearLabel}
						variant="inline"
						fullWidth={false}
						onPress={back.onPress}
					/>
				</View>
			) : null}
			{stacked ? (
				<View style={styles.stacked}>
					<View style={styles.buttons}>{exportButton}</View>
					{title}
				</View>
			) : (
				<View style={styles.row}>
					{title}
					<View style={styles.buttons}>{exportButton}</View>
				</View>
			)}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	block: {
		gap: space[100],
	},
	back: {
		alignItems: "flex-start",
	},
	row: {
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: space[300],
	},
	stacked: {
		gap: space[200],
	},
	titleBlock: {
		flex: 1,
		gap: space[50],
	},
	title: {
		...textStyles.display,
	},
	buttons: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: space[200],
	},
});
