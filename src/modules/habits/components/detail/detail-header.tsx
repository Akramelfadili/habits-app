import { StyleSheet, Text, View } from "react-native";
import { HeaderPillButton } from "@/components/ui/composite/header-buttons";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { detailCopy } from "../../messages";

type DetailHeaderProps = {
	/** "FITNESS · TUE, THU" — the caps line over the title. */
	eyebrow: string;
	title: string;
	/** "Upper body, heading. Fitness, Tuesday and Thursday." */
	accessibilityLabel: string;
	onEdit: () => void;
};

/**
 * V3-02 for Habit Detail (D1): the category and cadence as an eyebrow, the
 * habit's name as the display title (two lines, then it truncates; at
 * accessibility sizes it wraps freely, D8), and Edit as a 44 pt pill. At
 * accessibility sizes Edit moves above the title. Eyebrow and title are one
 * VoiceOver stop.
 */
export function DetailHeader({
	eyebrow,
	title,
	accessibilityLabel,
	onEdit,
}: DetailHeaderProps) {
	const { colors } = useTheme();
	const stacked = useAccessibilityTextSize();

	const block = (
		<View
			accessible
			accessibilityRole="header"
			accessibilityLabel={accessibilityLabel}
			style={styles.titleBlock}
		>
			<SectionLabel>{eyebrow}</SectionLabel>
			<Text
				numberOfLines={stacked ? undefined : 2}
				style={[styles.title, { color: colors.ink }]}
			>
				{title}
			</Text>
		</View>
	);
	const edit = <HeaderPillButton label={detailCopy.edit} onPress={onEdit} />;

	return stacked ? (
		<View style={styles.stacked}>
			<View style={styles.buttons}>{edit}</View>
			{block}
		</View>
	) : (
		<View style={styles.row}>
			{block}
			<View style={styles.buttons}>{edit}</View>
		</View>
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
	},
});
