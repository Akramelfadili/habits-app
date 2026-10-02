import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/primitives/button";
import { TextField } from "@/components/ui/primitives/text-field";
import { MAX_CATEGORY_NAME_LENGTH } from "../constants";
import { findDuplicateCategory } from "../services/category-rules";
import type { Category } from "../types";
import {
	type CategoryNameFormValues,
	duplicateRenameMessage,
	makeCategoryNameSchema,
} from "./category-name-schema";

/** NEW-24 error under the field when the write itself fails. */
export const RENAME_FAILED_MESSAGE =
	"Couldn't rename this category. Try again.";

type RenameCategoryFieldProps = {
	category: Category;
	/** Every category — the duplicate check covers built-ins and other customs. */
	categories: readonly Category[];
	onRename: (name: string) => Promise<unknown>;
	/** Leaves edit mode — after a save, or on Cancel. */
	onDone: () => void;
	isSaving?: boolean;
};

/**
 * Inline rename (HAB-25) — the add-category sheet's name rules in place of
 * the row: 20-character limit with the counter from 16, paste trimmed to
 * fit, duplicates (case/space-insensitive, built-ins included) blocked with
 * the clash named. The category's own name in a different case is allowed.
 * No mockup covers this state; the layout is a proposal.
 */
export function RenameCategoryField({
	category,
	categories,
	onRename,
	onDone,
	isSaving = false,
}: RenameCategoryFieldProps) {
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
	const trimmed = name.trim();
	const duplicate = findDuplicateCategory(categories, name, category.id);
	const blocked = trimmed === "" || duplicate !== undefined || isSaving;

	const save = handleSubmit(async (values) => {
		if (values.name === category.name) {
			onDone();
			return;
		}
		try {
			await onRename(values.name);
		} catch {
			// Stays in edit mode with the name kept, so retrying is one tap.
			setError("name", { type: "rename", message: RENAME_FAILED_MESSAGE });
			return;
		}
		onDone();
	});

	return (
		<View style={styles.root}>
			<Controller
				control={control}
				name="name"
				render={({ field }) => (
					<TextField
						label={`Rename ${category.name}`}
						value={field.value}
						onChangeText={(text) => {
							clearErrors("name");
							field.onChange(text);
						}}
						onBlur={field.onBlur}
						onSubmitEditing={blocked ? undefined : save}
						maxLength={MAX_CATEGORY_NAME_LENGTH}
						nearLimitCounter
						warning={
							duplicate
								? duplicateRenameMessage(duplicate)
								: errors.name?.type === "rename"
									? errors.name.message
									: undefined
						}
						autoFocus
					/>
				)}
			/>
			<View style={styles.actions}>
				<Button
					label="Cancel"
					variant="link"
					size="small"
					fullWidth={false}
					onPress={onDone}
					accessibilityLabel={`Cancel renaming ${category.name}`}
				/>
				<Button
					label="Save"
					variant="inline"
					size="small"
					fullWidth={false}
					onPress={save}
					disabled={blocked}
					loading={isSaving}
					accessibilityLabel={`Save new name for ${category.name}`}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		gap: 8,
		// Room for TextField's outline, which sits 10px outside its content.
		padding: 10,
	},
	actions: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: 20,
	},
});
