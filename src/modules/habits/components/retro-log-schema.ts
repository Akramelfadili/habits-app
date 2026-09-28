import { z } from "zod";
import { MAX_NOTE_LENGTH, MAX_QUANTITY_VALUE } from "../constants";

/**
 * Retro log's form (HAB-10): one draft value per shown habit, keyed by habit
 * id, plus the note. The note field already stops accepting input at the cap
 * (`maxLength`); the schema is the save-time backstop, not the primary limit.
 */
export const retroLogFormSchema = z.object({
	values: z.record(
		z.string(),
		z.union([z.boolean(), z.number().int().min(0).max(MAX_QUANTITY_VALUE)]),
	),
	note: z.string().max(MAX_NOTE_LENGTH),
});

export type RetroLogFormValues = z.infer<typeof retroLogFormSchema>;
