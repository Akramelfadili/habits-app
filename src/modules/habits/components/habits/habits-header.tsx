import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import {
	HeaderCircleButton,
	HeaderPillButton,
} from "@/components/ui/composite/header-buttons";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { habitsCopy } from "../../messages";

type HabitsHeaderProps = {
	/** "7 active · 2 archived", "No habits", or the reorder line. */
	eyebrow: string;
	/** What VoiceOver says for the title block: "Habits, heading. 7 active, 1 archived." */
	accessibilityLabel: string;
	/** Reorder mode: Done replaces the gear and the plus (H4). */
	reordering: boolean;
	onOpenSettings: () => void;
	onAddHabit: () => void;
	onDone: () => void;
	/** Scroll-linked shrink and fade of the whole row, from `useCollapsingHeader`. */
	animatedStyle?: object;
	/** The inline bar has taken over: this row stops taking taps and leaves VoiceOver. */
	collapsed?: boolean;
};

/**
 * V3-02 for the Habits tab (H1, H4): the counts as an eyebrow, the display title,
 * and two 44 pt circles — the gear to Settings and the plus to Add habit — or,
 * while reordering, Done. At accessibility text sizes the buttons move above the
 * title (H10). Eyebrow and title are one VoiceOver stop.
 */
export function HabitsHeader({
	eyebrow,
	accessibilityLabel,
	reordering,
	onOpenSettings,
	onAddHabit,
	onDone,
	animatedStyle,
	collapsed = false,
}: HabitsHeaderProps) {
	const { colors } = useTheme();
	const stacked = useAccessibilityTextSize();

	const title = (
		<View
			accessible
			accessibilityRole="header"
			accessibilityLabel={accessibilityLabel}
			style={styles.titleBlock}
		>
			<SectionLabel>{eyebrow}</SectionLabel>
			<Text style={[styles.title, { color: colors.ink }]}>
				{habitsCopy.screenTitle}
			</Text>
		</View>
	);
	const buttons = reordering ? (
		<HeaderPillButton label={habitsCopy.reorderDone} onPress={onDone} />
	) : (
		<>
			<HeaderCircleButton
				symbol="gearshape"
				accessibilityLabel={habitsCopy.settings}
				onPress={onOpenSettings}
			/>
			<HeaderCircleButton
				symbol="plus"
				accessibilityLabel={habitsCopy.addHabit}
				onPress={onAddHabit}
			/>
		</>
	);

	return (
		<Animated.View
			pointerEvents={collapsed ? "none" : "auto"}
			accessibilityElementsHidden={collapsed}
			importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"}
			style={animatedStyle}
		>
			{stacked ? (
				<View style={styles.stacked}>
					<View style={styles.buttons}>{buttons}</View>
					{title}
				</View>
			) : (
				<View style={styles.row}>
					{title}
					<View style={styles.buttons}>{buttons}</View>
				</View>
			)}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
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
