import { z } from "zod";
import {
	BUILT_IN_CATEGORIES,
	type BuiltInCategoryName,
	DEFAULT_TARGET_AMOUNT,
	findBuiltInCategory,
} from "../constants";
import type { Category, Frequency, HabitDirection } from "../types";
import {
	DEFAULT_FREQUENCY_FORM_VALUES,
	type HabitFormInput,
	toFrequencyFormValues,
} from "./habit-form-schema";

/**
 * What a suggestion hands the New habit form: every field the suggestion knows. The form
 * fills them in and says where they came from; nothing is saved until Save is tapped.
 */
export type HabitFormPrefill = {
	name: string;
	/** A built-in's name; null leaves the category empty (the habit goes to Other). */
	category: BuiltInCategoryName | null;
	direction: HabitDirection;
	target: { amount: number; unit: string } | null;
	frequency: Frequency;
};

export function blankFormValues(name = ""): HabitFormInput {
	return {
		name,
		categoryId: null,
		direction: "build",
		targetType: "simple",
		targetAmount: DEFAULT_TARGET_AMOUNT,
		targetUnit: "",
		...DEFAULT_FREQUENCY_FORM_VALUES,
	};
}

/** The form's starting values for a suggestion (a Break habit is always a check). */
export function prefillToFormValues(
	prefill: HabitFormPrefill,
	categories: readonly Category[],
): HabitFormInput {
	const category = prefill.category
		? findBuiltInCategory(categories, prefill.category)
		: undefined;
	const quantity = prefill.target !== null && prefill.direction === "build";
	return {
		...blankFormValues(prefill.name),
		categoryId: category?.id ?? null,
		direction: prefill.direction,
		targetType: quantity ? "quantity" : "simple",
		targetAmount: quantity
			? (prefill.target?.amount ?? DEFAULT_TARGET_AMOUNT)
			: DEFAULT_TARGET_AMOUNT,
		targetUnit: quantity ? (prefill.target?.unit ?? "") : "",
		...toFrequencyFormValues(prefill.frequency),
	};
}

const prefillSchema = z.object({
	name: z.string().trim().min(1),
	category: z
		.enum(
			BUILT_IN_CATEGORIES.map((category) => category.name) as [
				string,
				...string[],
			],
		)
		.nullable(),
	direction: z.enum(["build", "break"]),
	target: z
		.object({ amount: z.number().int().positive(), unit: z.string() })
		.nullable(),
	frequency: z.discriminatedUnion("type", [
		z.object({ type: z.literal("daily") }),
		z.object({
			type: z.literal("weekdays"),
			days: z.array(z.number().int().min(1).max(7)),
		}),
		z.object({
			type: z.literal("per-week"),
			timesPerWeek: z.number().int().min(1).max(7),
		}),
	]),
});

/**
 * Reads a suggestion handed over as the prefill route param (a JSON string), so Browse
 * suggestions can push the new-habit route with it. Anything that is not a complete, valid
 * suggestion is ignored: the form then opens blank rather than half filled.
 */
export function parseHabitPrefill(
	param: string | undefined,
): HabitFormPrefill | undefined {
	if (!param) return undefined;
	try {
		const parsed = prefillSchema.safeParse(JSON.parse(param));
		return parsed.success ? (parsed.data as HabitFormPrefill) : undefined;
	} catch {
		return undefined;
	}
}
