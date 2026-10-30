import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { DestructiveConfirmSheet } from "@/components/ui/composite/destructive-confirm-sheet";
import { Caption } from "@/components/ui/primitives/caption";
import { CategoryChip } from "@/components/ui/primitives/category-chip";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { Category, CategoryUsage } from "../types";
import { categorySymbol } from "./category-symbol";
import {
	affectedHabitsLine,
	CANCEL_LABEL,
	deleteCategoryBody,
	deleteCategoryConfirmLabel,
	deleteCategoryHeadline,
} from "./delete-category-sheet-helpers";

type DeleteCategorySheetProps = {
	/** The category being deleted, with its habits; null while closed. */
	usage: CategoryUsage | null;
	/** Where its habits go — the built-in Other. */
	other: Category;
	onKeep: () => void;
	onConfirm: () => void;
	isWorking?: boolean;
};

/**
 * Delete a custom category (HAB-25). Unused (F4a): a plain confirm. In use
 * (F4b): names the count and shows the move — "Music → Other" with every
 * affected habit listed. No "move habits first" step: the delete always
 * reassigns to Other in the same action.
 */
export function DeleteCategorySheet({
	usage,
	other,
	onKeep,
	onConfirm,
	isWorking = false,
}: DeleteCategorySheetProps) {
	const { colors, scheme } = useTheme();
	const habitCount = usage?.habitNames.length ?? 0;
	const accentOf = (category: Category) => ({
		tint: habitAccentTint(category.hue, scheme),
		ink: habitAccentInk(category.hue, scheme),
	});

	return (
		<DestructiveConfirmSheet
			visible={usage !== null}
			headline={deleteCategoryHeadline(usage?.category.name ?? "")}
			body={deleteCategoryBody(habitCount)}
			preview={
				usage && habitCount > 0 ? (
					<Container variant="outlined">
						<View style={styles.preview}>
							<View testID="category-move-preview" style={styles.move}>
								<View style={styles.from}>
									<CategoryChip
										label={usage.category.name}
										state="unselected"
										symbol={categorySymbol(usage.category)}
										accent={accentOf(usage.category)}
									/>
								</View>
								<SymbolView
									name="arrow.right"
									size={14}
									tintColor={colors.faint}
									accessibilityLabel="moves to"
								/>
								<CategoryChip
									label={other.name}
									state="locked"
									symbol={categorySymbol(other)}
									accent={accentOf(other)}
								/>
							</View>
							<Caption>{affectedHabitsLine(usage.habitNames)}</Caption>
						</View>
					</Container>
				) : undefined
			}
			cancelLabel={CANCEL_LABEL}
			confirmLabel={deleteCategoryConfirmLabel(habitCount)}
			onCancel={onKeep}
			onConfirm={onConfirm}
			isWorking={isWorking}
		/>
	);
}

const styles = StyleSheet.create({
	preview: {
		gap: 10,
	},
	move: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	// Shrinks first, so a long custom name truncates rather than pushing Other off.
	from: {
		flexShrink: 1,
	},
});
