import { formCopy } from "../messages";
import { isNameOverLimit } from "./habit-form-schema";

export type FormIssues = {
	count: number;
	/** The reason Save is off, shown under it — undefined when Save can go. */
	reason: string | undefined;
	fields: ("name" | "weekdays" | "unit")[];
};

type FormState = {
	name: string;
	/** The saved name in edit mode, so an unchanged legacy name over the cap still passes. */
	originalName?: string;
	duplicate: boolean;
	noWeekdays: boolean;
	unitBlank: boolean;
	unitTouched: boolean;
};

/**
 * What stands between the form and Save: an empty name has its own reason (Add a name to
 * save); otherwise every inline error is counted (Fix 2 issues to save). An empty name is
 * not an error, and neither is a unit nobody has reached yet. Pure, so the count and the
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
