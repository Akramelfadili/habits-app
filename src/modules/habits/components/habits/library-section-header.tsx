import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { minTouchTarget, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type LibrarySectionHeaderProps = {
	/** "Active · 7", "Archived · 2" — shown in caps. */
	label: string;
	/** The word at the far edge: "Reorder", "Show", "Hide". Omit for a plain header. */
	actionLabel?: string;
	/** What VoiceOver says for the action when the visible word alone is not enough. */
	actionAccessibilityLabel?: string;
	onAction?: () => void;
	/** The disclosure's state, for VoiceOver ("collapsed"/"expanded"). */
	expanded?: boolean;
	/** What the action does, read after its label ("Shows the archived habits."). */
	actionHint?: string;
};

/**
 * One section's header on the Habits tab (H1, H5): the caps label and, at the
 * far edge, a 44 pt text action — Reorder on Active, Show / Hide on Archived. A
 * plain header is a heading; with an action the label and action are separate
 * stops, the action carrying the section's name so it never reads "Show" alone.
 */
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
