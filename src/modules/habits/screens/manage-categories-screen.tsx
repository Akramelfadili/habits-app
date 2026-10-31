import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AddRow } from "@/components/ui/composite/add-row";
import { CategoryRow } from "@/components/ui/composite/category-row";
import { Container } from "@/components/ui/composite/container";
import { ReorderableList } from "@/components/ui/composite/reorderable-list";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { habitAccentInk, habitAccentTint, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { AddCategorySheet } from "../components/add-category-sheet";
import { CategoriesHeader } from "../components/categories/categories-header";
import { CategoryNameEditor } from "../components/categories/category-name-editor";
import { categorySymbol } from "../components/category-symbol";
import { DeleteCategorySheet } from "../components/delete-category-sheet";
import { LibrarySectionHeader } from "../components/habits/library-section-header";
import { OTHER_CATEGORY_NAME } from "../constants";
import { movableCategories } from "../domain/category-rules";
import { useCategoryActions } from "../hooks/use-category-actions";
import { useManageCategoriesQueries } from "../hooks/use-manage-categories-queries";
import { categoriesCopy, messages, showMessage } from "../messages";
import type { Category, CategoryUsage } from "../types";

/**
 * Categories (HAB-42, C1–C6, DC6), pushed from Habits › Categories. Custom
 * categories first, with Rename (inline) and Delete; then the ten built-ins,
 * locked, with a tag. Counts include archived habits. Reorder swaps the lists
 * for one set of handles that sets the group order on Today and Habits (Other
 * stays last and is not in it). Deleting a category nobody uses is one tap and
 * leaves an Undo for five seconds; deleting one in use names the habits that
 * move to Other first.
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
		restoreCategory,
		reorderCategories,
	} = useCategoryActions();
	const [mode, setMode] = useState<"browse" | "reorder">("browse");
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
		const { category, habitNames } = deleting;
		const result = await deleteCategory(category.id);
		// On failure the sheet stays open (the hook has toasted it), so retrying
		// is one tap; nothing changed.
		if (!result.ok) return;
		setDeletingId(null);
		if (habitNames.length === 0) {
			showMessage(messages.categoryDeleted, [category.name], () =>
				restoreCategory(result.value),
			);
		} else {
			showMessage(messages.categoryDeletedMoved, [
				category.name,
				habitNames.length,
			]);
		}
	}

	const row = (
		{ category, activeCount, archivedCount }: CategoryUsage,
		extra: Partial<React.ComponentProps<typeof CategoryRow>>,
	) => (
		<CategoryRow
			key={category.id}
			name={category.name}
			symbol={categorySymbol(category)}
			accent={accentOf(category)}
			meta={categoriesCopy.count(activeCount, archivedCount)}
			{...extra}
		/>
	);

	const reordering = mode === "reorder";
	const movable = movableCategories(categories);

	return (
		<View style={[styles.screen, { backgroundColor: colors.bg }]}>
			<ScrollView
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
			>
				<CategoriesHeader
					eyebrow={
						reordering
							? categoriesCopy.reorderMode.eyebrow
							: categoriesCopy.eyebrow(builtIns.length, customs.length)
					}
					accessibilityLabel={categoriesCopy.headerLabel(
						builtIns.length,
						customs.length,
					)}
					mode={mode}
					renaming={renamingId !== null}
					onReorder={() => {
						setRenamingId(null);
						setMode("reorder");
					}}
					onDone={() => setMode("browse")}
					onAdd={() => setIsAdding(true)}
				/>

				{reordering ? (
					<View style={styles.section}>
						<FieldHelper plain tone="hint">
							{categoriesCopy.reorderMode.note}
						</FieldHelper>
						<ReorderableList
							items={movable}
							keyOf={(category) => String(category.id)}
							handleLabel={(category) =>
								categoriesCopy.reorderMode.handle(category.name)
							}
							moveLabels={{
								up: categoriesCopy.reorderMode.moveUp,
								down: categoriesCopy.reorderMode.moveDown,
							}}
							onReorder={(keys) => reorderCategories(keys.map(Number))}
							renderGroup={(_key, rows) => (
								<Container variant="flat">{rows}</Container>
							)}
							renderItem={(category, handle, isDragging) => (
								<CategoryRow
									name={category.name}
									symbol={categorySymbol(category)}
									accent={accentOf(category)}
									handle={handle}
									lifted={isDragging}
								/>
							)}
						/>
					</View>
				) : (
					<>
						<View style={styles.section}>
							<LibrarySectionHeader
								label={categoriesCopy.customHeader(customs.length)}
							/>
							{customs.length > 0 ? (
								<Container variant="flat">
									{customs.map((usage) =>
										row(usage, {
											actions: [
												{
													label: categoriesCopy.rename,
													accessibilityLabel: categoriesCopy.renameLabel(
														usage.category.name,
													),
													onPress: () => setRenamingId(usage.category.id),
												},
												{
													label: categoriesCopy.delete,
													accessibilityLabel: categoriesCopy.deleteLabel(
														usage.category.name,
													),
													onPress: () => setDeletingId(usage.category.id),
													destructive: true,
												},
											],
											editor:
												renamingId === usage.category.id ? (
													<CategoryNameEditor
														category={usage.category}
														categories={categories}
														onRename={(name) =>
															renameCategory(usage.category.id, name)
														}
														onDone={() => setRenamingId(null)}
														isSaving={isRenaming}
													/>
												) : undefined,
										}),
									)}
								</Container>
							) : (
								<Container variant="flat">
									<AddRow
										label={categoriesCopy.empty.title}
										subtitle={categoriesCopy.empty.body}
										embedded
										onPress={() => setIsAdding(true)}
									/>
								</Container>
							)}
						</View>

						<View style={styles.section}>
							<LibrarySectionHeader
								label={categoriesCopy.builtInHeader(builtIns.length)}
							/>
							<FieldHelper plain tone="hint">
								{categoriesCopy.builtInNote}
							</FieldHelper>
							<Container variant="flat">
								{builtIns.map((usage) =>
									row(usage, { tag: categoriesCopy.builtInTag }),
								)}
							</Container>
						</View>
					</>
				)}
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
		paddingHorizontal: space[500],
		paddingTop: space[300],
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		gap: space[500],
	},
	section: {
		gap: space[150],
	},
});
