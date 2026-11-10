import { StyleSheet, View } from "react-native";
import { ListItem } from "@/components/ui/composite/list-item";
import { RemoveButton } from "@/components/ui/composite/remove-button";
import { space } from "@/theme/theme";
import { remindersCopy } from "../messages";
import {
	formatReminderTime,
	reminderDaysLabel,
} from "../presenters/reminders-helpers";
import type { ReminderDraft } from "../types";

type ReminderRowProps = {
	reminder: ReminderDraft;
	off?: boolean;
	onEdit: () => void;
	onRemove: () => void;
};

export function ReminderRow({
	reminder,
	off = false,
	onEdit,
	onRemove,
}: ReminderRowProps) {
	const time = formatReminderTime(reminder);
	const days = reminderDaysLabel(reminder.weekdays);
	const spoken = off ? `${days} · ${remindersCopy.off}` : days;
	return (
		<View style={styles.row}>
			<RemoveButton
				accessibilityLabel={remindersCopy.remove(time)}
				onPress={onRemove}
			/>
			<View style={styles.text}>
				<ListItem
					embedded
					navigable
					title={time}
					subtitle={spoken}
					accessibilityLabel={`${time}, ${spoken}`}
					accessibilityHint={remindersCopy.rowHint}
					onPress={onEdit}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingLeft: space[100],
		paddingRight: space[350],
	},
	text: {
		flex: 1,
		paddingVertical: space[250],
	},
});
