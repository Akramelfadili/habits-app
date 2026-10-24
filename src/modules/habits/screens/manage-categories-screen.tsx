import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AddRow } from "@/components/ui/composite/add-row";
import { CategoryRow } from "@/components/ui/composite/category-row";
import { Container } from "@/components/ui/composite/container";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { CategoryChip } from "@/components/ui/primitives/category-chip";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { AddCategorySheet } from "../components/add-category-sheet";
import { categorySymbol } from "../components/category-symbol";
import { DeleteCategorySheet } from "../components/delete-category-sheet";
import { RenameCategoryField } from "../components/rename-category-field";
import { OTHER_CATEGORY_NAME } from "../constants";
import { useCategoryActions } from "../hooks/use-category-actions";
import { useManageCategoriesQueries } from "../hooks/use-manage-categories-queries";
import {
	BUILT_IN_TAG,
	habitCountLabel,
} from "../presenters/manage-categories-helpers";
import type { Category } from "../types";

/**
 * Manage Categories (HAB-25, frames F3a–F3c): the ten built-ins first,
 * locked — tinted chip, count, a quiet "Built-in" tag, no actions — then
 * the user's own in creation order (the picker's order too) with inline
 * Rename and Delete. Counts include archived habits, since deleting a
 * category moves those to Other as well (F4a/F4b).
 */
export function ManageCategoriesScreen() {
	const { colors, scheme } = useTheme();
	const { builtIns, customs, categories } = useManageCategoriesQueries();
	const {
		createCategory,
		isCreating,
		renameCategory,
		isRenaming,
		deleteCategory,
		isDeleting,
	} = useCategoryActions();
	const [isAdding, setIsAdding] = useState(false);
	const [renamingId, setRenamingId] = useState<number | null>(null);
	// Only the id is held: the sheet reads the category's habits live from
	// `customs`, so its count and button label never go stale while it's open.
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const deleting =
		customs.find(({ category }) => category.id === deletingId) ?? null;

	const other = builtIns.find(
		({ category }) => category.name === OTHER_CATEGORY_NAME,
	)?.category;

	const accentOf = (category: Category) => ({
		tint: habitAccentTint(category.hue, scheme),
		ink: habitAccentInk(category.hue, scheme),
	});

	async function handleDelete() {
		if (!deleting) return;
		const result = await deleteCategory(deleting.category.id);
		// On failure the sheet stays open (the hook has toasted it), so retrying
		// is one tap; nothing changed.
		if (result.ok) setDeletingId(null);
	}

	return (
		<View style={[styles.screen, { backgroundColor: colors.bg }]}>
			<ScrollView
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
			>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					Categories
				</Text>

				<View style={styles.section}>
					<SectionHeader
						size="group"
						title="Built-in"
						count={String(builtIns.length)}
					/>
					<Container tight>
						{builtIns.map(({ category, habitNames }) => (
							<CategoryRow
								key={category.id}
								chip={
									<CategoryChip
										label={category.name}
										state="locked"
										size="compact"
										symbol={categorySymbol(category)}
										accent={accentOf(category)}
									/>
								}
								meta={habitCountLabel(habitNames.length)}
								tag={BUILT_IN_TAG}
							/>
						))}
					</Container>
				</View>

				<View style={styles.section}>
					<SectionHeader
						size="group"
						title="Yours"
						count={customs.length > 0 ? String(customs.length) : undefined}
					/>
					{/* Rows, then a divider, then Add — one section each; with no
					    customs yet (F3a) the card holds only Add. */}
					<Container tight dividers compact>
						{customs.length > 0 ? (
							<View>
								{customs.map(({ category, habitNames }) => {
									return (
										<CategoryRow
											key={category.id}
											chip={
												<CategoryChip
													label={category.name}
													state="unselected"
													size="compact"
													symbol={categorySymbol(category)}
													accent={accentOf(category)}
												/>
											}
											meta={habitCountLabel(habitNames.length)}
											actions={[
												{
													label: "Rename",
													accessibilityLabel: `Rename ${category.name}`,
													onPress: () => setRenamingId(category.id),
												},
												{
													label: "Delete",
													accessibilityLabel: `Delete ${category.name}`,
													onPress: () => setDeletingId(category.id),
													destructive: true,
												},
											]}
											editor={
												renamingId === category.id ? (
													<RenameCategoryField
														category={category}
														categories={categories}
														onRename={(name) =>
															renameCategory(category.id, name)
														}
														onDone={() => setRenamingId(null)}
														isSaving={isRenaming}
													/>
												) : undefined
											}
										/>
									);
								})}
							</View>
						) : null}
						<AddRow
							label="Add category"
							embedded
							onPress={() => setIsAdding(true)}
						/>
					</Container>
				</View>
			</ScrollView>

			<AddCategorySheet
				visible={isAdding}
				categories={categories}
				onDismiss={() => setIsAdding(false)}
				onCreate={createCategory}
				onCreated={() => setIsAdding(false)}
				isCreating={isCreating}
			/>
			{other ? (
				<DeleteCategorySheet
					usage={deleting}
					other={other}
					onKeep={() => setDeletingId(null)}
					onConfirm={handleDelete}
					isWorking={isDeleting}
				/>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 24,
		gap: 16,
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
	section: {
		gap: 8,
	},
});
