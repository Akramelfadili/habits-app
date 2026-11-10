import type { RefObject } from "react";
import { type HostInstance, StyleSheet, Text, View } from "react-native";
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
	eyebrow: string;
	accessibilityLabel: string;
	reordering: boolean;
	onOpenSettings: () => void;
	onAddHabit: () => void;
	onDone: () => void;
	animatedStyle?: object;
	collapsed?: boolean;
	titleRef?: RefObject<HostInstance | null>;
};

export function HabitsHeader({
	eyebrow,
	accessibilityLabel,
	reordering,
	onOpenSettings,
	onAddHabit,
	onDone,
	animatedStyle,
	collapsed = false,
	titleRef,
}: HabitsHeaderProps) {
	const { colors } = useTheme();
	const stacked = useAccessibilityTextSize();

	const title = (
		<View
			ref={titleRef}
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
