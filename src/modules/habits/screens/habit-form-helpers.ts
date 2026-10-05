import { MAX_HABIT_NAME_LENGTH } from "../constants";
import { isNameOverLimit, NO_CATEGORY_MESSAGE } from "./habit-form-schema";

/** Save's blocking reason with no name yet — outranks the category reason. */
export const NO_NAME_MESSAGE = "Add a name to save this habit";

/** Save's blocking reason for an edited V1 name still over the cap (HAB-22). */
export const SHORTEN_NAME_MESSAGE = `Shorten the name to ${MAX_HABIT_NAME_LENGTH} characters to save`;

/**
 * Why Save is disabled, for the helper line above it (HAB-24, VAR-13) — one
 * reason at a time: a missing or too-long name outranks a missing category,
 * so both are never shown together. Undefined when neither blocks.
 * `originalName` is the saved name in edit mode (see `isNameOverLimit`).
 */
export function saveBlockedReason(values: {
	name: string;
	categoryId: number | null;
	originalName?: string;
}): string | undefined {
	if (values.name.trim() === "") return NO_NAME_MESSAGE;
	if (isNameOverLimit(values.name, values.originalName)) {
		return SHORTEN_NAME_MESSAGE;
	}
	if (values.categoryId === null) return NO_CATEGORY_MESSAGE;
	return undefined;
}
