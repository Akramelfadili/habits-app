import { DestructiveConfirmSheet } from "@/components/ui/composite/destructive-confirm-sheet";
import {
	archiveInsteadBody,
	deleteConsequence,
	deleteHeadline,
} from "./delete-habit-sheet-helpers";

type DeleteHabitSheetProps = {
	visible: boolean;
	habitName: string;
	/** Every logged day the delete would erase. */
	loggedDays: number;
	currentStreak: number;
	/** False for a habit that's already archived — there's nothing to offer instead. */
	canArchive: boolean;
	onKeep: () => void;
	onArchive: () => unknown;
	onDelete: () => unknown;
	isWorking?: boolean;
};

/**
 * Delete confirmation (HAB-13, reworked by HAB-23 / E7): NEW-33's "with
 * archive action" state. "Archive instead" is one whole-card button (NEW-25),
 * so the sheet has exactly Keep habit, the card, and Delete permanently — the
 * safe option dominant, the permanent one smallest; don't "simplify" the
 * delete into a filled red button. An already-archived habit gets the plain
 * state: nothing to offer instead.
 */
export function DeleteHabitSheet({
	visible,
	habitName,
	loggedDays,
	currentStreak,
	canArchive,
	onKeep,
	onArchive,
	onDelete,
	isWorking = false,
}: DeleteHabitSheetProps) {
	return (
		<DestructiveConfirmSheet
			visible={visible}
			headline={deleteHeadline(habitName)}
			body={deleteConsequence(loggedDays)}
			action={
				canArchive
					? {
							title: "Archive instead",
							body: archiveInsteadBody(currentStreak),
							onPress: onArchive,
						}
					: undefined
			}
			keepLabel="Keep habit"
			confirmLabel="Delete permanently"
			onKeep={onKeep}
			onConfirm={onDelete}
			isWorking={isWorking}
		/>
	);
}
