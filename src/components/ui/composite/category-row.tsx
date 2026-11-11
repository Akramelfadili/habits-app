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
	accessibilityLabel: string;
	onPress: () => void;
	destructive?: boolean;
	disabled?: boolean;
};

type CategoryRowProps = {
	name: string;
	symbol: SFSymbol;
	accent: { tint: string; ink: string };
	meta?: string;
	tag?: string;
	actions?: CategoryRowAction[];
	handle?: ReactNode;
	lifted?: boolean;
	accessibilityActions?: { label: string; onAction: () => void }[];
	editor?: ReactNode;
};

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
				trailingBelowOnLargeText={!handle && !tag && !!actions}
				lifted={lifted}
				// A reorder row gets the move actions on the row itself; rows with their own buttons read as one line.
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
