import { failureMessage } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { saveDayLog } from "../repositories/entry-repository";

async function saveDayNote(
	date: Date,
	habitId: number,
	note: string,
): Promise<void> {
	await saveDayLog(date, { values: [], noteHabitId: habitId, note });
}

export function useDayNoteActions() {
	const save = useAsyncAction(saveDayNote, {
		scope: "day-note",
		failure: failureMessage("save", "that note"),
	});

	return { saveNote: save.run, isSavingNote: save.isLoading };
}
