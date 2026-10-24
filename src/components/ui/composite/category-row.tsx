import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/primitives/button";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

export type CategoryRowAction = {
	label: string;
	/** Names what it acts on ("Rename Music") — the visible label alone repeats on every row. */
	accessibilityLabel: string;
	onPress: () => void;
	/** The red text style, for a permanent action (Delete). */
	destructive?: boolean;
	disabled?: boolean;
};

type CategoryRowProps = {
	/** A `CategoryChip` — locked for a built-in, unselected-style for a custom. */
	chip: ReactNode;
	/** Live count, e.g. "2 habits" or "Not used". */
	meta: string;
	/** Quiet trailing tag ("Built-in") — for a row with no actions. */
	tag?: string;
	actions?: CategoryRowAction[];
	/** Replaces the whole row while editing in place (inline rename). */
	editor?: ReactNode;
};

/**
 * NEW-29 Category row (design-system.md, HAB-25): chip, count, then
 * either a quiet tag (built-ins — no actions at all) or text actions
 * (custom: Rename, Delete).
 */
export function CategoryRow({
	chip,
	meta,
	tag,
	actions,
	editor,
}: CategoryRowProps) {
	const { colors } = useTheme();

	if (editor) {
		return (
			<View testID="category-row" style={styles.editor}>
				{editor}
			</View>
		);
	}

	return (
		<View testID="category-row" style={styles.row}>
			<View style={styles.chip}>{chip}</View>
			<Text style={[styles.meta, { color: colors.sub }]}>{meta}</Text>
			{tag ? (
				<Text style={[styles.tag, { color: colors.faint }]}>{tag}</Text>
			) : null}
			{actions?.map((action) => (
				// Wrapped: an inline Button aligns itself to the top of its
				// parent, which would lift it off the row's centre line.
				<View key={action.label}>
					<Button
						label={action.label}
						accessibilityLabel={action.accessibilityLabel}
						onPress={action.onPress}
						variant={action.destructive ? "destructive" : "inline"}
						size="small"
						fullWidth={false}
						disabled={action.disabled}
					/>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 3,
		paddingHorizontal: 4,
	},
	editor: {
		paddingVertical: 3,
	},
	// A column capped at the free width, so a long name truncates inside its
	// chip instead of pushing the count and actions off the row.
	chip: {
		flex: 1,
		alignItems: "flex-start",
	},
	meta: {
		fontSize: typeScale.caption,
	},
	tag: {
		fontSize: typeScale.caption,
	},
});
