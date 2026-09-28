import { useState } from "react";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { Button } from "@/components/ui/primitives/button";
import { TimeWheel } from "@/components/ui/primitives/time-wheel";

type Time = { hour: number; minute: number };

type ReminderTimeSheetProps = {
	/** The time being edited — null keeps the sheet closed. */
	time: Time | null;
	onDismiss: () => void;
	onSave: (time: Time) => void;
};

/** Bottom sheet with a time wheel, for changing one reminder's time (HAB-12). */
export function ReminderTimeSheet({
	time,
	onDismiss,
	onSave,
}: ReminderTimeSheetProps) {
	return (
		<Sheet visible={time !== null} onDismiss={onDismiss}>
			{time ? (
				<TimeSheetContent
					// Re-seed the draft each time a different time is opened.
					key={`${time.hour}:${time.minute}`}
					initial={time}
					onDismiss={onDismiss}
					onSave={onSave}
				/>
			) : null}
		</Sheet>
	);
}

function TimeSheetContent({
	initial,
	onDismiss,
	onSave,
}: {
	initial: Time;
	onDismiss: () => void;
	onSave: (time: Time) => void;
}) {
	const [draft, setDraft] = useState(initial);

	return (
		<>
			<SheetHeader
				title="Reminder time"
				actionLabel="Cancel"
				onAction={onDismiss}
			/>
			<TimeWheel hour={draft.hour} minute={draft.minute} onChange={setDraft} />
			<Button label="Save time" onPress={() => onSave(draft)} />
		</>
	);
}
