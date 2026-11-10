import { DestructiveConfirmSheet } from "@/components/ui/composite/destructive-confirm-sheet";
import { detailCopy } from "../../messages";

type DeleteHabitSheetProps = {
	visible: boolean;
	habitName: string;
	/** Every log the delete would erase, named in the sheet. */
	logCount: number;
	/** False for a habit that is already archived: there is nothing to offer instead. */
	canArchive: boolean;
	/** The delete is running: Cancel is disabled and the sheet cannot be dismissed. */
	isDeleting: boolean;
	/** The last delete failed: a banner in the sheet, and Delete can be tried again. */
	failed: boolean;
	onCancel: () => void;
	onArchive: () => unknown;
	onDelete: () => unknown;
};

/**
 * Names what is lost ("Deletes Read 20 min and its 214 logs"), offers Archive instead first and as
 * the default focus, then Delete permanently, then Cancel, no Close. Deleting disables Cancel and
 * blocks the swipe; a failure is a banner inside the sheet saying nothing was changed, with Delete
 * still there to try again. The sheet only asks; the screen pops to Habits with a toast when it
 * works.
 */
export function DeleteHabitSheet({
	visible,
	habitName,
	logCount,
	canArchive,
	isDeleting,
	failed,
	onCancel,
	onArchive,
	onDelete,
}: DeleteHabitSheetProps) {
	const copy = detailCopy.confirm;

	return (
		<DestructiveConfirmSheet
			visible={visible}
			headline={copy.deleteTitle(habitName)}
			body={copy.deleteBody(habitName, logCount, canArchive)}
			safeAction={
				canArchive
					? {
							title: copy.archiveInstead,
							body: copy.archiveInsteadBody,
							onPress: onArchive,
						}
					: undefined
			}
			confirmLabel={copy.deletePermanently}
			confirmHint={copy.deleteHint}
			busy={{ label: copy.deleting, hint: copy.deletingHint }}
			error={
				failed && !isDeleting
					? { title: copy.deleteFailedTitle, message: copy.deleteFailedBody }
					: undefined
			}
			cancelLabel={copy.cancel}
			onCancel={onCancel}
			onConfirm={onDelete}
			isWorking={isDeleting}
		/>
	);
}
