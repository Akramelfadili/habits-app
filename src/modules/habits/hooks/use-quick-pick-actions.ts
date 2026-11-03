import { useRef } from "react";
import type { UseFormSetValue } from "react-hook-form";
import {
	blankFormValues,
	prefillToFormValues,
} from "../presenters/habit-form-prefill";
import type { HabitFormInput } from "../presenters/habit-form-schema";
import type { Suggestion } from "../suggestions";
import type { Category } from "../types";

type QuickPickInput = {
	setValue: UseFormSetValue<HabitFormInput>;
	categories: readonly Category[];
};

/**
 * FR2's quick picks. A pick fills every field the suggestion knows — category
 * and target stay out of sight — and typing a different name drops those two
 * again, so a renamed habit is never saved under a category or amount nobody
 * chose. `changeName` is the name field's handler on every form; it only has
 * something to undo after a pick.
 */
export function useQuickPickActions({ setValue, categories }: QuickPickInput) {
	// The pick whose hidden fields (category, target) are still in the form.
	const picked = useRef<Suggestion | null>(null);

	function pickSuggestion(suggestion: Suggestion) {
		picked.current = suggestion;
		const values = prefillToFormValues(
			{
				name: suggestion.name,
				category: suggestion.category,
				direction: suggestion.direction,
				target: suggestion.target,
				frequency: suggestion.frequency,
			},
			categories,
		);
		for (const [key, value] of Object.entries(values)) {
			setValue(key as keyof HabitFormInput, value as never, {
				shouldDirty: true,
			});
		}
	}

	function changeName(text: string) {
		if (picked.current && text !== picked.current.name) {
			picked.current = null;
			const blank = blankFormValues();
			setValue("categoryId", blank.categoryId, { shouldDirty: true });
			setValue("targetType", blank.targetType, { shouldDirty: true });
			setValue("targetAmount", blank.targetAmount, { shouldDirty: true });
			setValue("targetUnit", blank.targetUnit, { shouldDirty: true });
		}
		setValue("name", text, { shouldDirty: true });
	}

	return { pickSuggestion, changeName };
}
