import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { CategoryChip } from "@/components/ui/primitives/category-chip";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { Category } from "../types";
import { categorySymbol } from "./category-symbol";

type CategoryPickerProps = {
	/** Picker order: built-ins, then customs by creation (as the repository returns them). */
	categories: Category[];
	selectedId: number | null;
	onSelect: (id: number) => void;
	onAdd: () => void;
};

const COLUMNS = 2;

/**
 * The New/Edit habit category card (HAB-24, frames F1a–F1c): a 2-up grid of
 * NEW-28 chips with "Add category" always last. Picking one sets the habit's
 * icon and color — the header shows the result once something's selected.
 */
export function CategoryPicker({
	categories,
	selectedId,
	onSelect,
	onAdd,
}: CategoryPickerProps) {
	const { colors, scheme } = useTheme();
	const selected = categories.find((category) => category.id === selectedId);
	const accentOf = (category: Category) => ({
		tint: habitAccentTint(category.hue, scheme),
		ink: habitAccentInk(category.hue, scheme),
	});

	const cells: { key: string; node: ReactNode }[] = [
		...categories.map((category) => ({
			key: String(category.id),
			node: (
				<CategoryChip
					label={category.name}
					state={category.id === selectedId ? "selected" : "unselected"}
					symbol={categorySymbol(category)}
					accent={accentOf(category)}
					// A habit always has exactly one category — re-tapping it is a no-op.
					onPress={() => {
						if (category.id !== selectedId) onSelect(category.id);
					}}
				/>
			),
		})),
		{
			key: "add",
			node: <CategoryChip label="Add category" state="add" onPress={onAdd} />,
		},
	];
	const rows: (typeof cells)[] = [];
	for (let index = 0; index < cells.length; index += COLUMNS) {
		rows.push(cells.slice(index, index + COLUMNS));
	}

	return (
		<Container>
			<View style={styles.header}>
				<SectionLabel>Category</SectionLabel>
				{selected ? (
					<View style={styles.selected}>
						<IconBadge
							size="small"
							symbol={categorySymbol(selected)}
							accent={accentOf(selected)}
						/>
						<Text
							numberOfLines={1}
							style={[styles.selectedName, { color: colors.ink }]}
						>
							{selected.name}
						</Text>
					</View>
				) : (
					<Text style={[styles.hint, { color: colors.faint }]}>
						Sets the habit's icon & colour
					</Text>
				)}
			</View>
			<View style={styles.grid}>
				{rows.map((row) => (
					<View
						key={row[0].key}
						testID="category-picker-row"
						style={styles.row}
					>
						{row.map((cell) => (
							<View key={cell.key} style={styles.cell}>
								{cell.node}
							</View>
						))}
						{row.length < COLUMNS ? <View style={styles.cell} /> : null}
					</View>
				))}
			</View>
		</Container>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		minHeight: 22,
	},
	hint: {
		fontSize: typeScale.caption,
	},
	selected: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		flexShrink: 1,
	},
	selectedName: {
		fontSize: 12,
		fontWeight: "500",
		flexShrink: 1,
	},
	grid: {
		gap: 8,
	},
	row: {
		flexDirection: "row",
		gap: 8,
	},
	cell: {
		flex: 1,
		minWidth: 0,
	},
});
