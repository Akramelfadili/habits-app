import { StyleSheet, Text, View } from "react-native";
import {
	HeaderCircleButton,
	HeaderPillButton,
} from "@/components/ui/composite/header-buttons";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { useAccessibilityTextSize } from "@/utils/use-accessibility-text-size";
import { categoriesCopy } from "../../messages";

type CategoriesHeaderProps = {
	/** "10 built-in · 2 custom", or the reorder line. */
	eyebrow: string;
	/** What VoiceOver says for the title block. */
	accessibilityLabel: string;
	mode: "browse" | "reorder";
	/** Renaming in place draws neither Reorder nor Done (C3). */
	renaming?: boolean;
	onReorder: () => void;
	onDone: () => void;
	onAdd: () => void;
};

/**
 * V3-02 for Categories (C1, C2): the counts as an eyebrow, the display title,
 * and — browsing — a Reorder pill beside a + circle, or — reordering — Done.
 * Reorder is always there: the built-ins reorder too (Other stays last), so even
 * with no custom category it is offered, unlike the C6 frame.
 * At accessibility sizes the buttons move above the title. Eyebrow and title
 * are one VoiceOver stop.
 */
export function CategoriesHeader({
	eyebrow,
	accessibilityLabel,
	mode,
	renaming = false,
	onReorder,
	onDone,
	onAdd,
}: CategoriesHeaderProps) {
	const { colors } = useTheme();
	const stacked = useAccessibilityTextSize();

	const title = (
		<View
			accessible
			accessibilityRole="header"
			accessibilityLabel={accessibilityLabel}
			style={styles.title}
		>
			<SectionLabel>{eyebrow}</SectionLabel>
			<Text style={[styles.display, { color: colors.ink }]}>
				{categoriesCopy.title}
			</Text>
		</View>
	);
	const buttons =
		mode === "reorder" ? (
			<HeaderPillButton label={categoriesCopy.done} onPress={onDone} />
		) : (
			<>
				{!renaming ? (
					<HeaderPillButton
						label={categoriesCopy.reorder}
						onPress={onReorder}
					/>
				) : null}
				<HeaderCircleButton
					symbol="plus"
					accessibilityLabel={categoriesCopy.add}
					onPress={onAdd}
				/>
			</>
		);

	return stacked ? (
		<View style={styles.stackedRoot}>
			<View style={styles.buttons}>{buttons}</View>
			{title}
		</View>
	) : (
		<View style={styles.root}>
			{title}
			<View style={styles.buttons}>{buttons}</View>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: space[300],
	},
	stackedRoot: {
		gap: space[200],
	},
	title: {
		flex: 1,
		gap: space[50],
	},
	display: {
		...textStyles.display,
	},
	buttons: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[200],
	},
});
