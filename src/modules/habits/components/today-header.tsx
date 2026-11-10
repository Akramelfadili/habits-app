import { format } from "date-fns";
import type { RefObject } from "react";
import { type HostInstance, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { HeaderCircleButton } from "@/components/ui/composite/header-buttons";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { todayCopy } from "../messages";

type TodayHeaderProps = {
	/** The day shown: the eyebrow carries its date, so a past day reads as one. */
	day: Date;
	/** Opens New habit: the `+`. */
	onAddHabit: () => void;
	/** Scroll-linked shrink and fade of the whole row, from `useCollapsingHeader`. */
	animatedStyle?: object;
	/** The inline bar has taken over: this row stops taking taps and leaves VoiceOver. */
	collapsed?: boolean;
	/** The title block, so a re-tap of the tab can put the screen reader on it. */
	titleRef?: RefObject<HostInstance | null>;
};

/**
 * The date as an eyebrow, the display title, and a trailing 44 pt circle `+`. At accessibility text
 * sizes the title wraps and the button moves above it. Eyebrow and title are one VoiceOver stop:
 * "Today, heading. Friday 23 October."
 */
export function TodayHeader({
	day,
	onAddHabit,
	animatedStyle,
	collapsed = false,
	titleRef,
}: TodayHeaderProps) {
	const { colors } = useTheme();
	const stacked = useAccessibilityTextSize();

	const title = (
		<View
			ref={titleRef}
			accessible
			accessibilityRole="header"
			accessibilityLabel={`${todayCopy.screenTitle}, ${format(day, "EEEE d MMMM")}`}
			style={styles.titleBlock}
		>
			<SectionLabel>{format(day, "EEEE, d MMMM")}</SectionLabel>
			<Text style={[styles.title, { color: colors.ink }]}>
				{todayCopy.screenTitle}
			</Text>
		</View>
	);
	const add = (
		<HeaderCircleButton
			symbol="plus"
			accessibilityLabel={todayCopy.addHabit}
			onPress={onAddHabit}
		/>
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
					<View style={styles.buttons}>{add}</View>
					{title}
				</View>
			) : (
				<View style={styles.row}>
					{title}
					<View style={styles.buttons}>{add}</View>
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
