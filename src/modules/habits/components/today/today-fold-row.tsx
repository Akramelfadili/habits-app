import { Pressable, StyleSheet, Text, View } from "react-native";
import { minTouchTarget, radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { todayCopy } from "../../messages";

type TodayFoldRowProps = {
	summary: string;
	expanded: boolean;
	onToggle: () => void;
};

/**
 * The one quiet dashed row the not-due habits fold into: "1 not due today · Upper body" with Show on
 * the right. Tapping it reveals them with dashed circles, so a bonus log is still one tap away.
 */
export function TodayFoldRow({
	summary,
	expanded,
	onToggle,
}: TodayFoldRowProps) {
	const { colors, opacity } = useTheme();
	const largeText = useAccessibilityTextSize();
	const action = expanded ? todayCopy.foldHide : todayCopy.foldShow;

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${summary}. ${action}`}
			accessibilityState={{ expanded }}
			onPress={onToggle}
			style={({ pressed }) => [
				styles.row,
				{ borderColor: colors.border },
				pressed && { opacity: opacity.pressed },
			]}
		>
			<Text
				numberOfLines={largeText ? undefined : 1}
				style={[styles.summary, { color: colors.sub }]}
			>
				{summary}
			</Text>
			<View style={styles.action}>
				<Text style={[styles.actionText, { color: colors.ink }]}>{action}</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		minHeight: minTouchTarget,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: space[200],
		paddingHorizontal: space[350],
		paddingVertical: space[200],
		borderRadius: radius.l,
		borderWidth: 1,
		borderStyle: "dashed",
	},
	summary: {
		flex: 1,
		...textStyles.footnote,
	},
	action: {
		justifyContent: "center",
	},
	actionText: {
		...textStyles.subhead,
	},
});
