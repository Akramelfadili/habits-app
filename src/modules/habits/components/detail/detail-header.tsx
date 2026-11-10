import { useRef } from "react";
import { type HostInstance, StyleSheet, Text, View } from "react-native";
import { HeaderPillButton } from "@/components/ui/composite/header-buttons";
import { ROUTE_FOCUS_DELAY_MS } from "@/components/ui/composite/screen-header";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { useInitialFocus } from "@/utils/use-initial-focus";
import { detailCopy } from "../../messages";

type DetailHeaderProps = {
	eyebrow: string;
	title: string;
	accessibilityLabel: string;
	onEdit: () => void;
};

export function DetailHeader({
	eyebrow,
	title,
	accessibilityLabel,
	onEdit,
}: DetailHeaderProps) {
	const { colors } = useTheme();
	const stacked = useAccessibilityTextSize();
	// A pushed screen starts the screen reader on its title.
	const titleRef = useRef<HostInstance>(null);
	useInitialFocus(titleRef, true, ROUTE_FOCUS_DELAY_MS);

	const block = (
		<View
			ref={titleRef}
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
