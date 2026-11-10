import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { WeekdayPicker } from "@/components/ui/composite/weekday-picker";
import { Button } from "@/components/ui/primitives/button";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { TimeWheel } from "@/components/ui/primitives/time-wheel";
import { space } from "@/theme/theme";
import { WEEKDAYS } from "../constants";
import { reminderSheetCopy } from "../messages";
import type { IsoWeekday, ReminderDraft } from "../types";

type ReminderSheetProps = {
	draft: ReminderDraft | null;
	title: string;
	onDismiss: () => void;
	onSave: (draft: ReminderDraft) => void;
	/** Whether the days picker shows. Off for a time that has no days of its own (the Evening review). */
	showDays?: boolean;
};

/**
 * Bottom sheet with a 24-hour time wheel and the days the time repeats on: one place to set a
 * reminder's time and its own weekdays. The form uses it before the habit exists; the Reminders
 * screen uses it afterwards.
 */
export function ReminderSheet({
	draft,
	title,
	onDismiss,
	onSave,
	showDays = true,
}: ReminderSheetProps) {
	return (
		<Sheet visible={draft !== null} onDismiss={onDismiss}>
			{draft ? (
				<ReminderSheetContent
					// Re-seed the draft each time a different one is opened.
					key={`${draft.hour}:${draft.minute}:${draft.weekdays.join("")}`}
					initial={draft}
					title={title}
					onDismiss={onDismiss}
					onSave={onSave}
					showDays={showDays}
				/>
			) : null}
		</Sheet>
	);
}

function ReminderSheetContent({
	initial,
	title,
	onDismiss,
	onSave,
	showDays,
}: {
	initial: ReminderDraft;
	title: string;
	onDismiss: () => void;
	onSave: (draft: ReminderDraft) => void;
	showDays: boolean;
}) {
	const [time, setTime] = useState({
		hour: initial.hour,
		minute: initial.minute,
	});
	const [weekdays, setWeekdays] = useState<IsoWeekday[]>(initial.weekdays);
	const noDays = showDays && weekdays.length === 0;

	return (
		<>
			<SheetHeader
				title={title}
				actionLabel={reminderSheetCopy.cancel}
				onAction={onDismiss}
			/>
			<TimeWheel hour={time.hour} minute={time.minute} onChange={setTime} />
			{showDays ? (
				<View style={styles.days}>
					<SectionLabel>{reminderSheetCopy.repeatOn}</SectionLabel>
					<WeekdayPicker
						days={WEEKDAYS}
						selected={weekdays}
						onChange={(days) => setWeekdays([...days].sort((a, b) => a - b))}
					/>
					{noDays ? (
						<FieldHelper tone="error">{reminderSheetCopy.noDays}</FieldHelper>
					) : null}
				</View>
			) : null}
			<Button
				label={reminderSheetCopy.save}
				disabled={noDays}
				onPress={() => onSave({ ...time, weekdays })}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	days: {
		gap: space[200],
	},
});
