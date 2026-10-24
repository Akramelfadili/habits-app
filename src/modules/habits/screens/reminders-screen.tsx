import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AddRow } from "@/components/ui/composite/add-row";
import { Banner } from "@/components/ui/composite/banner";
import { headerBackOptions } from "@/components/ui/composite/header-buttons";
import { MovedSettingPointer } from "@/components/ui/composite/moved-setting-pointer";
import { Caption } from "@/components/ui/primitives/caption";
import { showToast } from "@/store/toast-store";
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
import {
	formatReminderTime,
	parseWeekdayParam,
	reminderCountLabel,
} from "../presenters/reminders-helpers";
import type { Reminder } from "../types";

type RemindersScreenProps = {
	habitId: number;
	/**
	 * The `addTime` route param: an ISO weekday (1–7). Opens straight into
	 * "Add a time" with that day pre-selected — the Monthly pattern insight's
	 * action (HAB-16). Anything else, or a habit already at the reminder cap,
	 * opens Reminders as usual.
	 */
	addTime?: string;
};

const NOTIFICATIONS_OFF_NOTICE =
	"Notifications are off for this app. Times stay saved — turn them on in Settings to receive these.";

/**
 * Reminders (HAB-12): one habit's independent reminder times, each with its
 * own days and toggle → "Add a time" (capped at 4) → the notifications-off
 * notice when permission is denied. The app-wide Evening review no longer
 * lives here (HAB-21) — only a temporary pointer to Settings.
 */
export function RemindersScreen({ habitId, addTime }: RemindersScreenProps) {
	const addTimeDay = parseWeekdayParam(addTime);
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
	const hasOpenedAddTime = useRef(false);
	const habitToAddTo = data ? data.habit : undefined;
	const canAddTime = data ? !data.atCap : false;

	// The deep link from Monthly: add the time once, as soon as the habit has
	// loaded, and go straight to its time picker like a tap on "Add a time".
	useEffect(() => {
		if (addTimeDay === undefined || hasOpenedAddTime.current) return;
		if (!habitToAddTo) return;
		hasOpenedAddTime.current = true;
		if (!canAddTime) return;
		void actions.addReminder(habitToAddTo, [addTimeDay]).then((result) => {
			if (result.ok) setEditingId(result.value.id);
		});
	}, [addTimeDay, habitToAddTo, canAddTime, actions.addReminder]);

	// Still loading: a neutral blank, never a "not found" flash (audit A5-04).
	if (data === undefined) {
		return (
			<View
				testID="screen-loading"
				style={[styles.screen, { backgroundColor: colors.bg }]}
			/>
		);
	}

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

	// No confirmation: the row goes at once and the toast offers Undo, which puts
	// the same row (id, time, days, on/off) back and re-syncs its notifications.
	async function handleRemove(reminder: Reminder) {
		const result = await actions.removeReminder(habit, reminder.id);
		if (!result.ok) return;
		showToast({
			message: `Removed the ${formatReminderTime(reminder)} reminder`,
			actionLabel: "Undo",
			onAction: () => actions.restoreReminder(reminder),
		});
	}

	async function handleAdd() {
		const result = await actions.addReminder(habit);
		if (!result.ok) return;
		// Straight into picking its time — the default is only a placeholder.
		setEditingId(result.value.id);
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
						onRemove={() => handleRemove(reminder)}
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

				{/* TODO(backlog): remove NEW-27 and this pointer (docs/backlog.md). */}
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
					const result = await actions.editReminder(habit, editing.id, {
						hour,
						minute,
					});
					// A failed save leaves the sheet open (with its error toast) rather
					// than silently losing the edit.
					if (result.ok) setEditingId(null);
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
