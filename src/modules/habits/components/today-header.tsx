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
	day: Date;
	onAddHabit: () => void;
	animatedStyle?: object;
	collapsed?: boolean;
	titleRef?: RefObject<HostInstance | null>;
};

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
