import type { RefObject } from "react";
import { type HostInstance, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { HeaderPillButton } from "@/components/ui/composite/header-buttons";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { progressCopy } from "../../messages";

type ProgressHeaderProps = {
	eyebrow: string;
	exportUnavailable: boolean;
	onExport: () => void;
	animatedStyle?: object;
	collapsed?: boolean;
	titleRef?: RefObject<HostInstance | null>;
};

export function ProgressHeader({
	eyebrow,
	exportUnavailable,
	onExport,
	animatedStyle,
	collapsed = false,
	titleRef,
}: ProgressHeaderProps) {
	const { colors } = useTheme();
	const stacked = useAccessibilityTextSize();

	const title = (
		<View
			ref={titleRef}
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
