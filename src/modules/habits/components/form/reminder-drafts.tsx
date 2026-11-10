import { StyleSheet, View } from "react-native";
import { AddRow } from "@/components/ui/composite/add-row";
import { Container } from "@/components/ui/composite/container";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space } from "@/theme/theme";
import { REMINDER_CAP } from "../../constants";
import { formCopy, remindersCopy } from "../../messages";
import type { ReminderDraft } from "../../types";
import { ReminderRow } from "../reminder-row";

export type QueuedReminder = ReminderDraft & { key: number };

type ReminderDraftsProps = {
	reminders: QueuedReminder[];
	onAdd: () => void;
	onEdit: (reminder: QueuedReminder) => void;
	onRemove: (reminder: QueuedReminder) => void;
};

/**
 * Reminders queued before the habit exists: each time with its own days, a red minus on the left
 * that removes it at once, a tap that edits it, and "Add time" under them (up to the cap of four).
 * Nothing is written until the form's Save.
 */
export function ReminderDrafts({
	reminders,
	onAdd,
	onEdit,
	onRemove,
}: ReminderDraftsProps) {
	const atCap = reminders.length >= REMINDER_CAP;
	return (
		<View style={styles.field}>
			<SectionLabel>{formCopy.reminders.label}</SectionLabel>
			<Container variant="flat">
				{[
					...reminders.map((reminder) => (
						<ReminderRow
							key={reminder.key}
							reminder={reminder}
							onEdit={() => onEdit(reminder)}
							onRemove={() => onRemove(reminder)}
						/>
					)),
					<AddRow
						key="add"
						embedded
						label={formCopy.reminders.add}
						disabled={atCap}
						onPress={onAdd}
					/>,
				]}
			</Container>
			<FieldHelper plain tone="hint">
				{atCap ? remindersCopy.cap : formCopy.reminders.hint}
			</FieldHelper>
		</View>
	);
}

const styles = StyleSheet.create({
	field: {
		gap: space[150],
	},
});
