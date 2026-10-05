import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AddRow } from "@/components/ui/composite/add-row";
import { Banner } from "@/components/ui/composite/banner";
import { headerBackOptions } from "@/components/ui/composite/header-buttons";
import { MovedSettingPointer } from "@/components/ui/composite/moved-setting-pointer";
import { Caption } from "@/components/ui/primitives/caption";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { ReminderCard } from "../components/reminder-card";
import { ReminderTimeSheet } from "../components/reminder-time-sheet";
import { TodayStatePanel } from "../components/today-state-panel";
import { REMINDER_CAP_MESSAGE, REMINDER_HINT } from "../constants";
import { useReminderActions } from "../hooks/use-reminder-actions";
import {
	type ReminderWithConflicts,
	useReminderQueries,
} from "../hooks/use-reminder-queries";
import { reminderCountLabel } from "./reminders-helpers";

type RemindersScreenProps = {
	habitId: number;
};

const NOTIFICATIONS_OFF_NOTICE =
	"Notifications are off for this app. Times stay saved — turn them on in Settings to receive these.";

/**
 * Reminders (HAB-12): one habit's independent reminder times, each with its
 * own days and toggle → "Add a time" (capped at 4) → the notifications-off
 * notice when permission is denied. The app-wide Evening review no longer
 * lives here (HAB-21) — only a temporary pointer to Settings.
 */
export function RemindersScreen({ habitId }: RemindersScreenProps) {
	const router = useRouter();
	const { colors } = useTheme();
	const data = useReminderQueries(habitId);
	const actions = useReminderActions();
	// A card with a conflict starts open so its warning is seen; every other
	// card starts collapsed. Once tapped, a card keeps the state it was left
	// in — so adding an unscheduled day to an open card can't collapse it
	// and hide the warning it just caused.
	const [expandedById, setExpandedById] = useState<
		ReadonlyMap<number, boolean>
	>(new Map());
	const [editingId, setEditingId] = useState<number | null>(null);

	if (!data) {
		return (
			<View style={[styles.screen, { backgroundColor: colors.bg }]}>
				<TodayStatePanel
					icon="questionmark"
					headline="Habit not found"
					subtitle="It may have been deleted."
				/>
			</View>
		);
	}

	const { habit, reminders, cap, atCap, notificationsDenied } = data;
	const editing = reminders.find((reminder) => reminder.id === editingId);

	function isExpanded(reminder: ReminderWithConflicts) {
		return expandedById.get(reminder.id) ?? reminder.unscheduledDays.length > 0;
	}

	function flip(reminder: ReminderWithConflicts) {
		const next = !isExpanded(reminder);
		setExpandedById((current) => new Map(current).set(reminder.id, next));
	}

	async function handleAdd() {
		const created = await actions.addReminder(habit);
		// Straight into picking its time — the default is only a placeholder.
		setEditingId(created.id);
	}

	return (
		<>
			<Stack.Screen
				options={headerBackOptions({
					title: habit.name,
					onPress: () => router.back(),
				})}
			/>
			<ScrollView
				style={[styles.screen, { backgroundColor: colors.bg }]}
				contentContainerStyle={styles.content}
			>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					Reminders
				</Text>

				{reminders.map((reminder) => (
					<ReminderCard
						key={reminder.id}
						reminder={reminder}
						expanded={isExpanded(reminder)}
						onToggleExpanded={() => flip(reminder)}
						onEditTime={() => setEditingId(reminder.id)}
						onChangeEnabled={(enabled) =>
							actions.editReminder(habit, reminder.id, { enabled })
						}
						onChangeDays={(weekdays) =>
							actions.editReminder(habit, reminder.id, { weekdays })
						}
						onRemove={() => actions.removeReminder(habit, reminder.id)}
					/>
				))}

				<View style={styles.addGroup}>
					<AddRow
						label="Add a time"
						count={reminderCountLabel(reminders.length, cap)}
						onPress={handleAdd}
						disabled={atCap || actions.isAdding}
					/>
					<Caption>{atCap ? REMINDER_CAP_MESSAGE : REMINDER_HINT}</Caption>
				</View>

				{notificationsDenied ? (
					<Banner tone="neutral">{NOTIFICATIONS_OFF_NOTICE}</Banner>
				) : null}

				{/* TODO(V2.1): remove NEW-27 and this pointer (docs/v3-backlog.md). */}
				<MovedSettingPointer
					body="Looking for the evening review? It covers every habit at once, so it now lives in Settings."
					linkLabel="Open Settings →"
					onPress={() => router.push("/habits/settings")}
				/>
			</ScrollView>

			<ReminderTimeSheet
				time={editing ?? null}
				onDismiss={() => setEditingId(null)}
				onSave={async ({ hour, minute }) => {
					if (!editing) return;
					setEditingId(null);
					await actions.editReminder(habit, editing.id, { hour, minute });
				}}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 24,
		gap: 12,
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
		marginBottom: 4,
	},
	addGroup: {
		gap: 8,
	},
});
