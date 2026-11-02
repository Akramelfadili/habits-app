import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { DestructiveConfirmSheet } from "@/components/ui/composite/destructive-confirm-sheet";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { categoriesCopy } from "../messages";
import type { Category, CategoryUsage } from "../types";

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
 * Delete a custom category (HAB-42). In use (C5): says how many habits move to
 * Other and that their history and streaks are kept, and lists each one with
 * its move ("Outdoors → Other") before the "Delete and move 1 habit" button.
 * Not in use (DC6): one destructive button and Cancel — nothing is lost, so
 * there is no lock; the Undo toast comes after. There is no "move habits
 * first" step: the delete always reassigns to Other in the same action.
 */
export function DeleteCategorySheet({
	usage,
	other,
	onKeep,
	onConfirm,
	isWorking = false,
}: DeleteCategorySheetProps) {
	const { colors } = useTheme();
	const name = usage?.category.name ?? "";
	const habitCount = usage?.habitNames.length ?? 0;
	const copy = categoriesCopy.deleteSheet;

	return (
		<DestructiveConfirmSheet
			visible={usage !== null}
			headline={copy.headline(name)}
			body={habitCount === 0 ? copy.unused : copy.inUse(habitCount)}
			preview={
				usage && habitCount > 0 ? (
					<Container variant="outlined">
						<View testID="category-move-preview" style={styles.preview}>
							{usage.habitNames.map((habit) => (
								<View key={habit} accessible style={styles.row}>
									<Text style={[styles.habit, { color: colors.ink }]}>
										{habit}
									</Text>
									<Text style={[styles.move, { color: colors.sub }]}>
										{copy.move(usage.category.name, other.name)}
									</Text>
								</View>
							))}
						</View>
					</Container>
				) : undefined
			}
			cancelLabel={copy.cancel}
			confirmLabel={
				habitCount === 0 ? copy.confirmUnused : copy.confirmInUse(habitCount)
			}
			onCancel={onKeep}
			onConfirm={onConfirm}
			isWorking={isWorking}
		/>
	);
}

const styles = StyleSheet.create({
	preview: {
		gap: space[250],
	},
	row: {
		gap: space[50],
	},
	habit: {
		...textStyles.body,
	},
	move: {
		...textStyles.footnote,
	},
});
