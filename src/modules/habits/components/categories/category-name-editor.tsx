import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/primitives/button";
import { TextField } from "@/components/ui/primitives/text-field";
import { space } from "@/theme/theme";
import { MAX_CATEGORY_NAME_LENGTH } from "../../constants";
import { findDuplicateCategory } from "../../domain/category-rules";
import { categoriesCopy } from "../../messages";
import type { Category } from "../../types";
import {
	type CategoryNameFormValues,
	makeCategoryNameSchema,
} from "../category-name-schema";

type CategoryNameEditorProps = {
	category: Category;
	/** Every category — the duplicate check covers built-ins and other customs. */
	categories: readonly Category[];
	onRename: (name: string) => Promise<unknown>;
	/** Leaves edit mode — after a save, or on Cancel. */
	onDone: () => void;
	isSaving?: boolean;
};

/**
 * Inline rename (C3, V3-15 + V3-16): the row's name becomes a field with a
 * Done beside it. 20 characters with the counter from 16, a paste trimmed to
 * fit, and a name that clashes with any category — built-ins included, case
 * and spaces ignored — says so under the field in danger ink. The category's
 * own name in another case is allowed.
 */
export function CategoryNameEditor({
	category,
	categories,
	onRename,
	onDone,
	isSaving = false,
}: CategoryNameEditorProps) {
	const schema = useMemo(
		() => makeCategoryNameSchema(categories, category.id),
		[categories, category.id],
	);
	const {
		control,
		handleSubmit,
		watch,
		setError,
		clearErrors,
		formState: { errors },
	} = useForm<CategoryNameFormValues>({
		resolver: zodResolver(schema),
		defaultValues: { name: category.name },
	});

	const name = watch("name");
	const duplicate = findDuplicateCategory(categories, name, category.id);
	const blocked = name.trim() === "" || duplicate !== undefined || isSaving;

	const save = handleSubmit(async (values) => {
		if (values.name === category.name) {
			onDone();
			return;
		}
		try {
			await onRename(values.name);
		} catch {
			// Stays in edit mode with the name kept, so retrying is one tap.
			setError("name", {
				type: "rename",
				message: categoriesCopy.renameField.failed,
			});
			return;
		}
		onDone();
	});

	return (
		<View style={styles.root}>
			<View style={styles.field}>
				<Controller
					control={control}
					name="name"
					render={({ field }) => (
						<TextField
							label={categoriesCopy.renameField.label(category.name)}
							hideLabel
							value={field.value}
							onChangeText={(text) => {
								clearErrors("name");
								field.onChange(text);
							}}
							onBlur={field.onBlur}
							onSubmitEditing={blocked ? undefined : save}
							maxLength={MAX_CATEGORY_NAME_LENGTH}
							error={
								duplicate
									? categoriesCopy.duplicate(duplicate.name)
									: errors.name?.type === "rename"
										? errors.name.message
										: undefined
							}
							autoFocus
						/>
					)}
				/>
			</View>
			<Button
				label={categoriesCopy.renameField.save}
				accessibilityLabel={categoriesCopy.renameField.saveLabel(category.name)}
				variant="inline"
				fullWidth={false}
				onPress={save}
				disabled={blocked}
				loading={isSaving}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: space[300],
	},
	field: {
		flex: 1,
	},
});
