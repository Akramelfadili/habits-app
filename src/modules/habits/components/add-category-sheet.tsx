import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { Button } from "@/components/ui/primitives/button";
import { CategoryChip } from "@/components/ui/primitives/category-chip";
import { TextField } from "@/components/ui/primitives/text-field";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { MAX_CATEGORY_NAME_LENGTH } from "../constants";
import {
	findDuplicateCategory,
	nextCategoryAppearance,
} from "../services/category-rules";
import type { Category, CreateCategoryInput } from "../types";
import {
	type CategoryNameFormValues,
	duplicateCategoryMessage,
	makeCategoryNameSchema,
	NO_CATEGORY_NAME_MESSAGE,
} from "./category-name-schema";
import { categorySymbol } from "./category-symbol";

/** The preview chip's label before anything's typed (F2a). */
const PREVIEW_PLACEHOLDER = "Your category";

/** NEW-24 error under the field when the write itself fails — same slot as a duplicate. */
export const CREATE_FAILED_MESSAGE = "Couldn't add this category. Try again.";

const PREVIEW_CAPTION =
	"Icon and colour are picked for you, so it stands apart from your other categories.";

type AddCategorySheetProps = {
	visible: boolean;
	/** Every existing category — for the duplicate check and the rotation pick. */
	categories: Category[];
	onDismiss: () => void;
	onCreate: (input: CreateCategoryInput) => Promise<Category>;
	/** After a successful add — the picker auto-selects it (no toast, HAB-24). */
	onCreated: (category: Category) => void;
	isCreating?: boolean;
};

/**
 * Add category (HAB-24, frames F2a–F2c): stacks over the habit form and asks
 * for a name only. Icon and color come from the rotation and are previewed
 * live, so the preview is exactly what's created; a duplicate name hides the
 * preview and explains which existing chip to pick instead.
 */
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
	const { colors, scheme } = useTheme();
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
	const blockedReason = trimmed === "" ? NO_CATEGORY_NAME_MESSAGE : undefined;

	const submit = handleSubmit(async (values) => {
		let created: Category;
		try {
			created = await onCreate({ name: values.name, ...appearance });
		} catch {
			// The sheet stays open with the name kept, so retrying is one tap.
			setError("name", { type: "create", message: CREATE_FAILED_MESSAGE });
			return;
		}
		onCreated(created);
	});

	return (
		<>
			<SheetHeader
				title="New category"
				actionLabel="Cancel"
				onAction={onDismiss}
			/>
			<View style={styles.field}>
				<Controller
					control={control}
					name="name"
					render={({ field }) => (
						<TextField
							label="Name"
							placeholder="e.g. Journaling"
							value={field.value}
							onChangeText={(text) => {
								// A failed add's message is about the last attempt, not this edit.
								clearErrors("name");
								field.onChange(text);
							}}
							onBlur={field.onBlur}
							maxLength={MAX_CATEGORY_NAME_LENGTH}
							nearLimitCounter
							warning={
								duplicate
									? duplicateCategoryMessage(duplicate)
									: errors.name?.message
							}
							autoFocus
						/>
					)}
				/>
			</View>
			{duplicate ? null : (
				<View
					testID="category-preview"
					style={[styles.preview, { backgroundColor: colors.inner }]}
				>
					<CategoryChip
						label={trimmed === "" ? PREVIEW_PLACEHOLDER : trimmed}
						state="preview"
						symbol={categorySymbol(appearance)}
						accent={{
							tint: habitAccentTint(appearance.hue, scheme),
							ink: habitAccentInk(appearance.hue, scheme),
						}}
					/>
					<Text style={[styles.caption, { color: colors.sub }]}>
						{PREVIEW_CAPTION}
					</Text>
				</View>
			)}
			<Button
				label="Add category"
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
		// Room for TextField's outline, which sits 10px outside its content.
		padding: 10,
	},
	preview: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		borderRadius: 14,
		padding: 12,
	},
	caption: {
		flex: 1,
		fontSize: typeScale.caption,
	},
});
