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
import type { Frequency, IsoWeekday } from "../types";

/** Save's blocking reason with no category picked (HAB-24) — see `saveBlockedReason`. */
export const NO_CATEGORY_MESSAGE = "Pick a category to save this habit";

export const NO_WEEKDAYS_MESSAGE = "Pick at least one day.";
export const NO_TARGET_UNIT_MESSAGE =
	'Give this target a unit, e.g. "glasses".';

export const NAME_TOO_LONG_MESSAGE = `Keep the name to ${MAX_HABIT_NAME_LENGTH} characters.`;

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
				message: NO_WEEKDAYS_MESSAGE,
			});
		}
		if (values.targetType === "quantity" && values.targetUnit.trim() === "") {
			ctx.addIssue({
				code: "custom",
				path: ["targetUnit"],
				message: NO_TARGET_UNIT_MESSAGE,
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
			.min(1, "Give this habit a name.")
			.refine(
				(name) => !isNameOverLimit(name, originalName),
				NAME_TOO_LONG_MESSAGE,
			),
		/** Null until picked — and a habit can't be saved without one (HAB-24). */
		categoryId: z
			.number()
			.int()
			.nullable()
			.refine((id) => id !== null, NO_CATEGORY_MESSAGE),
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
				`Keep the unit under ${MAX_TARGET_UNIT_LENGTH} characters.`,
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

/** What the form holds while editing — `categoryId` may still be null. */
export type HabitFormInput = z.input<typeof habitFormSchema>;
/** What a valid submit produces — `categoryId` narrowed to an id. */
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
