import { DestructiveConfirmSheet } from "@/components/ui/composite/destructive-confirm-sheet";
import { detailCopy } from "../../messages";

type DeleteHabitSheetProps = {
	visible: boolean;
	habitName: string;
	logCount: number;
	canArchive: boolean;
	isDeleting: boolean;
	failed: boolean;
	onCancel: () => void;
	onArchive: () => unknown;
	onDelete: () => unknown;
};

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
