import { formCopy } from "../messages";
import { isNameOverLimit } from "./habit-form-schema";

export type FormIssues = {
	count: number;
	reason: string | undefined;
	fields: ("name" | "weekdays" | "unit")[];
};

type FormState = {
	name: string;
	originalName?: string;
	duplicate: boolean;
	noWeekdays: boolean;
	unitBlank: boolean;
	unitTouched: boolean;
};

// Pure, so the count and the inline messages can never disagree.
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
	// A blank unit nobody has left yet is not an error on screen: a reason, not a count.
	if (fields.length === 0 && state.unitBlank) {
		return { count: 0, reason: formCopy.save.needsUnit, fields };
	}
	return {
		count: fields.length,
		reason: fields.length > 0 ? formCopy.save.issues(fields.length) : undefined,
		fields,
	};
}
