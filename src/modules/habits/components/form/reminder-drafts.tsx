import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { AddRow } from "@/components/ui/composite/add-row";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { minTouchTarget, radius, space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { REMINDER_CAP, REMINDER_CAP_MESSAGE } from "../../constants";
import { formCopy } from "../../messages";
import {
	formatReminderTime,
	reminderDaysLabel,
} from "../../presenters/reminders-helpers";
import type { ReminderDraft } from "../../types";

export type QueuedReminder = ReminderDraft & { key: number };

type ReminderDraftsProps = {
	reminders: QueuedReminder[];
	onAdd: () => void;
	onEdit: (reminder: QueuedReminder) => void;
	onRemove: (reminder: QueuedReminder) => void;
};

/**
 * Reminders queued before the habit exists (F7): each time with its own days,
 * a red minus on the left that removes it at once, a tap that edits it, and
 * "Add time" under them (up to the cap of four). Nothing is written until the
 * form's Save.
 */
export function ReminderDrafts({
	reminders,
	onAdd,
	onEdit,
	onRemove,
}: ReminderDraftsProps) {
	const { colors } = useTheme();
	const atCap = reminders.length >= REMINDER_CAP;
	return (
		<View style={styles.field}>
			<SectionLabel>{formCopy.reminders.label}</SectionLabel>
			<Container variant="flat">
				{[
					...reminders.map((reminder) => {
						const time = formatReminderTime(reminder);
						return (
							<View key={reminder.key} style={styles.row}>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={formCopy.reminders.remove(time)}
									onPress={() => onRemove(reminder)}
									style={styles.remove}
								>
									<View
										style={[styles.minus, { backgroundColor: colors.dangerBg }]}
									>
										<SymbolView
											name="minus"
											size={12}
											tintColor={colors.onAccent}
										/>
									</View>
								</Pressable>
								<View style={styles.rowText}>
									<ListItem
										embedded
										navigable
										title={time}
										subtitle={reminderDaysLabel(reminder.weekdays)}
										accessibilityLabel={`${time}, ${reminderDaysLabel(reminder.weekdays)}`}
										accessibilityHint={formCopy.reminders.editDays(time)}
										onPress={() => onEdit(reminder)}
									/>
								</View>
							</View>
						);
					}),
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
				{atCap ? REMINDER_CAP_MESSAGE : formCopy.reminders.hint}
			</FieldHelper>
		</View>
	);
}

const styles = StyleSheet.create({
	field: {
		gap: space[150],
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingLeft: space[100],
		paddingRight: space[350],
	},
	rowText: {
		flex: 1,
	},
	remove: {
		width: minTouchTarget,
		height: minTouchTarget,
		alignItems: "center",
		justifyContent: "center",
	},
	minus: {
		width: space[600],
		height: space[600],
		borderRadius: radius.pill,
		alignItems: "center",
		justifyContent: "center",
	},
});
