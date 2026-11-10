import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, StyleSheet, View } from "react-native";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { Button } from "@/components/ui/primitives/button";
import { CategoryChip } from "@/components/ui/primitives/category-chip";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { TextField } from "@/components/ui/primitives/text-field";
import { habitAccentInk, habitAccentTint, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { MAX_CATEGORY_NAME_LENGTH } from "../constants";
import {
	findDuplicateCategory,
	nextCategoryAppearance,
} from "../domain/category-rules";
import { categoriesCopy } from "../messages";
import type { Category, CreateCategoryInput } from "../types";
import {
	type CategoryNameFormValues,
	makeCategoryNameSchema,
} from "./category-name-schema";
import { categorySymbol } from "./category-symbol";

type AddCategorySheetProps = {
	visible: boolean;
	categories: Category[];
	onDismiss: () => void;
	onCreate: (input: CreateCategoryInput) => Promise<Category>;
	onCreated: (category: Category) => void;
	isCreating?: boolean;
};

export function AddCategorySheet(props: AddCategorySheetProps) {
	return (
		<Sheet visible={props.visible} onDismiss={props.onDismiss}>
			{/* Mounted only while open, so every open starts from an empty name. */}
			{props.visible ? <AddCategoryForm {...props} /> : null}
		</Sheet>
	);
}

function AddCategoryForm({
	categories,
	onDismiss,
	onCreate,
	onCreated,
	isCreating = false,
}: AddCategorySheetProps) {
	const { scheme } = useTheme();
	const schema = useMemo(
		() => makeCategoryNameSchema(categories),
		[categories],
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
		defaultValues: { name: "" },
	});

	const name = watch("name");
	const trimmed = name.trim();
	const duplicate = findDuplicateCategory(categories, name);
	const appearance = nextCategoryAppearance(categories);
	const blockedReason =
		trimmed === "" ? categoriesCopy.addSheet.needsName : undefined;

	const submit = handleSubmit(async (values) => {
		let created: Category;
		try {
			created = await onCreate({ name: values.name, ...appearance });
		} catch {
			setError("name", {
				type: "create",
				message: categoriesCopy.addSheet.failed,
			});
			return;
		}
		onCreated(created);
	});

	return (
		<>
			<SheetHeader
				title={categoriesCopy.addSheet.title}
				actionLabel={categoriesCopy.addSheet.close}
				onAction={onDismiss}
			/>
			<View style={styles.field}>
				<Controller
					control={control}
					name="name"
					render={({ field }) => (
						<TextField
							label={categoriesCopy.addSheet.name}
							placeholder={categoriesCopy.addSheet.placeholder}
							value={field.value}
							onChangeText={(text) => {
								// A failed add's message is about the last attempt, not this edit.
								clearErrors("name");
								field.onChange(text);
							}}
							onBlur={field.onBlur}
							maxLength={MAX_CATEGORY_NAME_LENGTH}
							error={
								duplicate
									? categoriesCopy.duplicate(duplicate.name)
									: errors.name?.message
							}
							autoFocus
							onSubmitEditing={
								duplicate || trimmed === "" ? Keyboard.dismiss : submit
							}
						/>
					)}
				/>
			</View>
			{duplicate ? null : (
				<View testID="category-preview" style={styles.preview}>
					<SectionLabel>{categoriesCopy.addSheet.preview}</SectionLabel>
					<CategoryChip
						label={
							trimmed === ""
								? categoriesCopy.addSheet.previewPlaceholder
								: trimmed
						}
						state="preview"
						symbol={categorySymbol(appearance)}
						accent={{
							tint: habitAccentTint(appearance.hue, scheme),
							ink: habitAccentInk(appearance.hue, scheme),
						}}
					/>
					<FieldHelper plain tone="hint">
						{categoriesCopy.addSheet.note}
					</FieldHelper>
				</View>
			)}
			<Button
				label={categoriesCopy.addSheet.submit}
				onPress={submit}
				disabled={trimmed === "" || duplicate !== undefined || isCreating}
				disabledReason={blockedReason}
				loading={isCreating}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	field: {
		paddingTop: space[100],
	},
	preview: {
		gap: space[150],
	},
});
