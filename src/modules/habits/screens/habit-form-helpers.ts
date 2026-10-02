import { NO_CATEGORY_MESSAGE } from "./habit-form-schema";

/** Save's blocking reason with no name yet — outranks the category reason. */
export const NO_NAME_MESSAGE = "Add a name to save this habit";

/**
 * Why Save is disabled, for the helper line above it (HAB-24, VAR-13) — one
 * reason at a time: a missing name outranks a missing category, so both are
 * never shown together. Undefined when neither blocks.
 */
export function saveBlockedReason(values: {
	name: string;
	categoryId: number | null;
}): string | undefined {
	if (values.name.trim() === "") return NO_NAME_MESSAGE;
	if (values.categoryId === null) return NO_CATEGORY_MESSAGE;
	return undefined;
}
