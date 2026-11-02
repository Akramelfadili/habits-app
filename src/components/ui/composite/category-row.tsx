import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { Button } from "@/components/ui/primitives/button";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { radius, space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { ListItem } from "./list-item";

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
	name: string;
	/** The category's own icon square (V3-32): its symbol and tint/ink. */
	symbol: SFSymbol;
	accent: { tint: string; ink: string };
	/** Live count, e.g. "2 habits", "2 habits · 1 archived" or "Not used"; omitted while reordering (C2). */
	meta?: string;
	/** Quiet trailing tag ("Built-in") — for a row with no actions. */
	tag?: string;
	actions?: CategoryRowAction[];
	/** Reorder mode (C2): the drag grip replaces the actions and the tag. */
	handle?: ReactNode;
	/** Held mid-drag: the E2 lift. */
	lifted?: boolean;
	/** VoiceOver's move actions (C2): the gestures a screen reader cannot make. */
	accessibilityActions?: { label: string; onAction: () => void }[];
	/** Replaces the whole row while editing in place (inline rename). */
	editor?: ReactNode;
};

/**
 * V3-15 category row on V3-23: the category's icon square, name and a count
 * line (archived habits included), then either a quiet "Built-in" tag
 * (locked, no actions), the text actions Rename and Delete (custom), or —
 * while reordering — the drag grip.
 */
export function CategoryRow({
	name,
	symbol,
	accent,
	meta,
	tag,
	actions,
	handle,
	lifted,
	accessibilityActions,
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

	const trailing =
		handle ??
		(tag ? (
			<View style={[styles.tag, { backgroundColor: colors.inner }]}>
				<Text style={[styles.tagText, { color: colors.sub }]}>{tag}</Text>
			</View>
		) : actions ? (
			<View style={styles.actions}>
				{actions.map((action) => (
					<Button
						key={action.label}
						label={action.label}
						accessibilityLabel={action.accessibilityLabel}
						onPress={action.onPress}
						variant={action.destructive ? "dangerLink" : "rowAction"}
						fullWidth={false}
						disabled={action.disabled}
					/>
				))}
			</View>
		) : undefined);

	return (
		<View testID="category-row">
			<ListItem
				title={name}
				subtitle={meta}
				leading={<IconBadge symbol={symbol} accent={accent} />}
				trailing={trailing}
				lifted={lifted}
				// Built-ins and rows with their own buttons read as one line; a
				// reorder row gets the move actions on the row itself.
				accessibilityLabel={[name, meta, tag?.toLowerCase()]
					.filter(Boolean)
					.join(", ")}
				accessibilityActions={handle ? accessibilityActions : undefined}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	editor: {
		paddingHorizontal: space[350],
		paddingVertical: space[250],
	},
	tag: {
		borderRadius: radius.s,
		paddingHorizontal: space[200],
		paddingVertical: space[50],
	},
	tagText: {
		...textStyles.caption,
	},
	actions: {
		flexDirection: "row",
		alignItems: "center",
		gap: space[300],
	},
});
