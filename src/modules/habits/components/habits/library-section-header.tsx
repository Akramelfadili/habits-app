import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { minTouchTarget, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type LibrarySectionHeaderProps = {
	label: string;
	actionLabel?: string;
	actionAccessibilityLabel?: string;
	onAction?: () => void;
	expanded?: boolean;
	actionHint?: string;
};

// With an action, label and action are separate VoiceOver stops; the action carries the section's name so it never reads "Show" alone.
export function LibrarySectionHeader({
	label,
	actionLabel,
	actionAccessibilityLabel,
	onAction,
	expanded,
	actionHint,
}: LibrarySectionHeaderProps) {
	const { colors, opacity } = useTheme();

	return (
		<View style={styles.row}>
			<View accessible accessibilityRole="header" style={styles.label}>
				<SectionLabel>{label}</SectionLabel>
			</View>
			{actionLabel && onAction ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
					accessibilityHint={actionHint}
					accessibilityState={expanded === undefined ? undefined : { expanded }}
					onPress={onAction}
					style={({ pressed }) => [
						styles.action,
						pressed && { opacity: opacity.pressed },
					]}
				>
					<Text style={[styles.actionLabel, { color: colors.ink }]}>
						{actionLabel}
					</Text>
				</Pressable>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		minHeight: minTouchTarget,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: space[100],
	},
	label: {
		flexShrink: 1,
	},
	action: {
		minHeight: minTouchTarget,
		minWidth: minTouchTarget,
		alignItems: "flex-end",
		justifyContent: "center",
	},
	actionLabel: {
		...textStyles.body,
	},
});
