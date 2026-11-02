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

/**
 * Whether `name` breaks the 32-character cap (HAB-22). A V1 habit saved with
 * a longer name (up to 40) keeps it while it's left unchanged, so its other
 * fields can still be edited; any change to the name brings it under the cap.
 */
export function isNameOverLimit(name: string, originalName?: string): boolean {
	const trimmed = name.trim();
	if (trimmed.length <= MAX_HABIT_NAME_LENGTH) return false;
	return originalName === undefined || trimmed !== originalName.trim();
}

/**
 * Frequency is kept as three flat fields rather than the `Frequency` union so
 * switching modes doesn't throw away what was picked in the other modes; only
 * the active mode's field is saved (see `toFrequency`).
 *
 * `originalName` is the habit's saved name in edit mode — omit it to create.
 */
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

/** The create-mode schema — every name capped at 32. */
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
		/** Null until picked: the category is optional, and a habit without one goes to Other (HAB-41). */
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

/** What the form holds while editing — `categoryId` may be null (none picked). */
export type HabitFormInput = z.input<typeof habitFormSchema>;
/** What a valid submit produces — `categoryId` still null when none was picked. */
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
