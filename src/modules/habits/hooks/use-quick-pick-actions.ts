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

// Typing a different name drops the hidden category and target again, so a renamed habit is never saved under a category or amount nobody chose.
export function useQuickPickActions({ setValue, categories }: QuickPickInput) {
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
