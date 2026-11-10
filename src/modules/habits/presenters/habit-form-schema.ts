import { z } from "zod";
import {
	DEFAULT_TIMES_PER_WEEK,
	MAX_HABIT_NAME_LENGTH,
	MAX_TARGET_AMOUNT,
	MAX_TARGET_UNIT_LENGTH,
	MAX_TIMES_PER_WEEK,
	MIN_TARGET_AMOUNT,
	MIN_TIMES_PER_WEEK,
} from "../constants";
import { formCopy } from "../messages";
import type { Frequency, IsoWeekday } from "../types";

// A legacy name (up to 40) stays valid while unchanged so the habit's other fields remain editable.
export function isNameOverLimit(name: string, originalName?: string): boolean {
	const trimmed = name.trim();
	if (trimmed.length <= MAX_HABIT_NAME_LENGTH) return false;
	return originalName === undefined || trimmed !== originalName.trim();
}

// Frequency is three flat fields, not the union, so switching modes doesn't discard what was
// picked in the others; only the active mode is saved (see `toFrequency`).
export function makeHabitFormSchema(originalName?: string) {
	return habitFormObject(originalName).superRefine((values, ctx) => {
		if (values.frequencyType === "weekdays" && values.weekdays.length === 0) {
			ctx.addIssue({
				code: "custom",
				path: ["weekdays"],
				message: formCopy.frequency.noDays,
			});
		}
		if (values.targetType === "quantity" && values.targetUnit.trim() === "") {
			ctx.addIssue({
				code: "custom",
				path: ["targetUnit"],
				message: formCopy.goal.unitMissing,
			});
		}
	});
}

export const habitFormSchema = makeHabitFormSchema();

function habitFormObject(originalName: string | undefined) {
	return z.object({
		name: z
			.string()
			.trim()
			.min(1, formCopy.save.needsName)
			.refine(
				(name) => !isNameOverLimit(name, originalName),
				formCopy.name.tooLong(MAX_HABIT_NAME_LENGTH),
			),
		categoryId: z.number().int().nullable(),
		direction: z.enum(["build", "break"]),
		targetType: z.enum(["simple", "quantity"]),
		targetAmount: z
			.number()
			.int()
			.min(MIN_TARGET_AMOUNT)
			.max(MAX_TARGET_AMOUNT),
		targetUnit: z
			.string()
			.trim()
			.max(
				MAX_TARGET_UNIT_LENGTH,
				formCopy.goal.unitTooLong(MAX_TARGET_UNIT_LENGTH),
			),
		frequencyType: z.enum(["daily", "weekdays", "per-week"]),
		weekdays: z.array(z.number().int().min(1).max(7)),
		timesPerWeek: z
			.number()
			.int()
			.min(MIN_TIMES_PER_WEEK)
			.max(MAX_TIMES_PER_WEEK),
	});
}

export type HabitFormInput = z.input<typeof habitFormSchema>;
export type HabitFormValues = z.output<typeof habitFormSchema>;

type FrequencyFormValues = Pick<
	HabitFormValues,
	"frequencyType" | "weekdays" | "timesPerWeek"
>;

export const DEFAULT_FREQUENCY_FORM_VALUES: FrequencyFormValues = {
	frequencyType: "daily",
	weekdays: [],
	timesPerWeek: DEFAULT_TIMES_PER_WEEK,
};

export function toFrequency(values: FrequencyFormValues): Frequency {
	switch (values.frequencyType) {
		case "weekdays":
			return {
				type: "weekdays",
				days: [...values.weekdays].sort((a, b) => a - b) as IsoWeekday[],
			};
		case "per-week":
			return { type: "per-week", timesPerWeek: values.timesPerWeek };
		default:
			return { type: "daily" };
	}
}

export function toFrequencyFormValues(
	frequency: Frequency,
): FrequencyFormValues {
	return {
		...DEFAULT_FREQUENCY_FORM_VALUES,
		frequencyType: frequency.type,
		...(frequency.type === "weekdays" && { weekdays: [...frequency.days] }),
		...(frequency.type === "per-week" && {
			timesPerWeek: frequency.timesPerWeek,
		}),
	};
}
