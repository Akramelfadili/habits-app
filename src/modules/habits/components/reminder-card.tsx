import { Pressable, StyleSheet, Text, View } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import { Container } from "@/components/ui/composite/container";
import { WeekdayPicker } from "@/components/ui/composite/weekday-picker";
import { Button } from "@/components/ui/primitives/button";
import { Toggle } from "@/components/ui/primitives/toggle";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { WEEKDAYS } from "../constants";
import type { ReminderWithConflicts } from "../hooks/use-reminder-queries";
import {
	formatReminderTime,
	reminderDaysLabel,
	unscheduledDaysWarning,
} from "../screens/reminders-helpers";
import type { IsoWeekday } from "../types";

type ReminderCardProps = {
	reminder: ReminderWithConflicts;
	expanded: boolean;
	onToggleExpanded: () => void;
	onEditTime: () => void;
	onChangeEnabled: (enabled: boolean) => void;
	onChangeDays: (days: IsoWeekday[]) => void;
	onRemove: () => void;
};

/**
 * One reminder time (HAB-12). Collapsed: time, its days, and its toggle
 * (docs/mockups/reminders-at-cap.png). Expanded: its own weekday chips, the
 * unscheduled-day warning if any, and Change time / Remove
 * (docs/mockups/reminders.png). The header is one tap target — nesting a
 * time button inside it would hide that button from VoiceOver. Turned off,
 * the whole card fades (as in the mockups) but stays fully editable.
 */
export function ReminderCard({
	reminder,
	expanded,
	onToggleExpanded,
	onEditTime,
	onChangeEnabled,
	onChangeDays,
	onRemove,
}: ReminderCardProps) {
	const { colors, opacity } = useTheme();
	const time = formatReminderTime(reminder);
	const hasConflict = reminder.unscheduledDays.length > 0;
	const faded = !reminder.enabled && { opacity: opacity.dimmed };

	return (
		// Container can't fade itself, so the wrapper does — surface, text and toggle together.
		<View testID="reminder-card" style={faded || undefined}>
			<Container>
				<View style={styles.header}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Reminder at ${time}, ${reminderDaysLabel(reminder.weekdays)}`}
						accessibilityState={{ expanded }}
						onPress={onToggleExpanded}
						style={({ pressed }) => [
							styles.headerText,
							pressed && { opacity: opacity.pressed },
						]}
					>
						<Text style={[styles.time, { color: colors.ink }]}>{time}</Text>
						<Text
							style={[
								styles.days,
								// Collapsed, the banner is hidden — the subtitle still flags it.
								{
									color: hasConflict && !expanded ? colors.warnInk : colors.sub,
								},
							]}
						>
							{reminderDaysLabel(reminder.weekdays)}
						</Text>
					</Pressable>
					<Toggle
						value={reminder.enabled}
						onValueChange={onChangeEnabled}
						accessibilityLabel={`Reminder at ${time} on`}
					/>
				</View>

				{expanded ? (
					<View style={styles.body}>
						<WeekdayPicker
							days={WEEKDAYS}
							selected={reminder.weekdays}
							onChange={onChangeDays}
						/>
						{hasConflict ? (
							<Banner>
								{unscheduledDaysWarning(reminder.unscheduledDays)}
							</Banner>
						) : null}
						<View style={styles.actions}>
							<Button
								label="Change time"
								variant="link"
								fullWidth={false}
								onPress={onEditTime}
							/>
							<Button
								label="Remove"
								variant="link"
								fullWidth={false}
								onPress={onRemove}
							/>
						</View>
					</View>
				) : null}
			</Container>
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	headerText: {
		flex: 1,
		alignItems: "flex-start",
		gap: 2,
	},
	time: {
		fontSize: typeScale.section,
		fontWeight: "500",
	},
	days: {
		fontSize: typeScale.subtitle,
	},
	body: {
		gap: 14,
	},
	actions: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
});
