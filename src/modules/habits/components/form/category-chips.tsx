import { StyleSheet, View } from "react-native";
import { CategoryChip } from "@/components/ui/primitives/category-chip";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { habitAccentInk, habitAccentTint, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { formCopy } from "../../messages";
import type { Category } from "../../types";
import { categorySymbol } from "../category-symbol";

type CategoryChipsProps = {
	categories: Category[];
	/** Null when none is picked: the habit then goes to Other. */
	selectedId: number | null;
	/** A tap on the picked chip clears it (the category is optional). */
	onSelect: (id: number | null) => void;
	onAdd: () => void;
};

/**
 * The form's category field: every category as a chip that wraps, the picked one filled with the
 * accent and checked, then "New category". Optional; the note under it says where a habit without
 * one goes. The category supplies the habit's icon and colour; there is no picker for them.
 */
export function CategoryChips({
	categories,
	selectedId,
	onSelect,
	onAdd,
}: CategoryChipsProps) {
	const { scheme } = useTheme();
	return (
		<View style={styles.field}>
			<SectionLabel>{formCopy.category.label}</SectionLabel>
			<View style={styles.chips} accessibilityRole="radiogroup">
				{categories.map((category) => (
					<CategoryChip
						key={category.id}
						label={category.name}
						state={category.id === selectedId ? "selected" : "unselected"}
						symbol={categorySymbol(category)}
						accent={{
							tint: habitAccentTint(category.hue, scheme),
							ink: habitAccentInk(category.hue, scheme),
						}}
						onPress={() =>
							onSelect(category.id === selectedId ? null : category.id)
						}
					/>
				))}
				<CategoryChip
					label={formCopy.category.newCategory}
					state="add"
					onPress={onAdd}
				/>
			</View>
			<FieldHelper plain tone="hint">
				{formCopy.category.optional}
			</FieldHelper>
		</View>
	);
}

const styles = StyleSheet.create({
	field: {
		gap: space[150],
	},
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		columnGap: space[200],
	},
});
