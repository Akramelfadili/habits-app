import { pluralise } from "@/utils/format";

/** Delete-category copy (HAB-25) — docs/mockups/hab-25-f4a.png, hab-25-f4b.png. */

export const CANCEL_LABEL = "Cancel";

export function deleteCategoryHeadline(name: string): string {
	return `Delete “${name}”?`;
}

/** F4a never mentions a move — nothing else is affected; F4b names the exact count. */
export function deleteCategoryBody(habitCount: number): string {
	if (habitCount === 0) {
		return "No habits use it, so nothing else changes. This can't be undone.";
	}
	if (habitCount === 1) {
		return "1 habit will move to Other and take its icon and colour. Its logs, streak and reminders stay exactly as they are.";
	}
	return `${pluralise(habitCount, "habit")} will move to Other and take its icon and colour. Their logs, streaks and reminders stay exactly as they are.`;
}

/** The destructive button repeats the consequence when there is one. */
export function deleteCategoryConfirmLabel(habitCount: number): string {
	if (habitCount === 0) return "Delete category";
	return `Delete and move ${pluralise(habitCount, "habit")}`;
}

/** The affected habits under the move preview — every one, never truncated. */
export function affectedHabitsLine(habitNames: readonly string[]): string {
	return habitNames.join(" · ");
}
