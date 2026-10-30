import { formCopy } from "../messages";
import { isNameOverLimit } from "./habit-form-schema";

export type FormIssues = {
	/** Inline errors that must be fixed before Save works; each one is on screen next to its field. */
	count: number;
	/** The reason Save is off, shown under it — undefined when Save can go. */
	reason: string | undefined;
	/** Which fields have an error, in form order. */
	fields: ("name" | "weekdays" | "unit")[];
};

type FormState = {
	name: string;
	/** The saved name in edit mode, so an unchanged V1 name over the cap still passes (HAB-22). */
	originalName?: string;
	duplicate: boolean;
	noWeekdays: boolean;
	/** Quantity is picked and the unit is blank. */
	unitBlank: boolean;
	/** The unit field has been left once, so its error is on screen. */
	unitTouched: boolean;
};

/**
 * What stands between the form and Save (F1, F8): an empty name has its own
 * reason ("Add a name to save"); otherwise every error already shown inline
 * is counted ("Fix 2 issues to save"). The empty name is not an error — the
 * field says nothing until the person has typed — and neither is a unit nobody
 * has reached yet. Pure, so the count and the
 * inline messages can never disagree.
 */
export function formIssues(state: FormState): FormIssues {
	const fields: FormIssues["fields"] = [];
	const nameEmpty = state.name.trim() === "";
	if (
		!nameEmpty &&
		(state.duplicate || isNameOverLimit(state.name, state.originalName))
	) {
		fields.push("name");
	}
	if (state.noWeekdays) fields.push("weekdays");
	if (state.unitBlank && state.unitTouched) fields.push("unit");
	if (nameEmpty) {
		return { count: fields.length, reason: formCopy.save.needsName, fields };
	}
	// A blank unit nobody has left yet is not an error on screen, so it is a
	// reason, not a count: "Add a unit to save".
	if (fields.length === 0 && state.unitBlank) {
		return { count: 0, reason: formCopy.save.needsUnit, fields };
	}
	return {
		count: fields.length,
		reason: fields.length > 0 ? formCopy.save.issues(fields.length) : undefined,
		fields,
	};
}
