import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Banner } from "@/components/ui/composite/banner";
import { Container } from "@/components/ui/composite/container";
import { EmptyState } from "@/components/ui/composite/empty-state";
import {
	HeaderCircleButton,
	headerBackOptions,
} from "@/components/ui/composite/header-buttons";
import { ScreenHeader } from "@/components/ui/composite/screen-header";
import { TAB_BAR_BOTTOM_PADDING } from "@/components/ui/composite/tab-bar-pill";
import { Button } from "@/components/ui/primitives/button";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { space } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { ReminderRow } from "../components/reminder-row";
import { ReminderSheet } from "../components/reminder-sheet";
import {
	DEFAULT_REMINDER_TIME,
	REMINDER_CAP_MESSAGE,
	WEEKDAYS,
} from "../constants";
import { useReminderActions } from "../hooks/use-reminder-actions";
import { useReminderQueries } from "../hooks/use-reminder-queries";
import {
	detailCopy,
	messages,
	reminderSheetCopy,
	remindersCopy,
	showMessage,
} from "../messages";
import { scheduleLabel } from "../presenters/habit-schedule-label";
import {
	formatReminderTime,
	unscheduledDaysWarning,
} from "../presenters/reminders-helpers";
import { canHabitFallOn } from "../strategies/frequency-strategy";
import type { Reminder, ReminderDraft } from "../types";

type RemindersScreenProps = {
	habitId: number;
};

/** The reminder sheet is open on a new time, or on a stored one. */
type SheetState =
	| { kind: "add"; draft: ReminderDraft }
	| { kind: "edit"; id: number; draft: ReminderDraft }
	| null;

/**
 * Reminders (HAB-43, R1–R3, R5): one habit's list of 24-hour times, each with
 * its own days. The red minus on the left removes a time at once with an Undo
 * toast; a tap opens the sheet to change its time and days; + (or the empty
 * state's button) opens it on 09:00. With iOS notifications off a banner says
 * why nothing will arrive and the times stay editable. The app-wide Evening
 * review lives in Settings, not here.
 */
export function RemindersScreen({ habitId }: RemindersScreenProps) {
	const router = useRouter();
	const { colors } = useTheme();
	const data = useReminderQueries(habitId);
	const actions = useReminderActions();
	const [sheet, setSheet] = useState<SheetState>(null);

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
				<EmptyState
					icon="questionmark"
					headline={detailCopy.notFound.title}
					subtitle={detailCopy.notFound.body}
				/>
			</View>
		);
	}

	const { habit, reminders, atCap, notificationsDenied } = data;
	const everyDay = WEEKDAYS.map(({ day }) => day).filter((day) =>
		canHabitFallOn(habit, day),
	);
	const conflicts = reminders.filter(
		(reminder) => reminder.unscheduledDays.length > 0,
	);

	function openAdd() {
		setSheet({
			kind: "add",
			draft: { ...DEFAULT_REMINDER_TIME, weekdays: everyDay },
		});
	}

	// No confirmation: the row goes at once and the toast offers Undo, which puts
	// the same row (id, time, days) back and re-syncs its notifications.
	async function handleRemove(reminder: Reminder) {
		const result = await actions.removeReminder(habit, reminder.id);
		if (!result.ok) return;
		showMessage(messages.reminderRemoved, [formatReminderTime(reminder)], () =>
			actions.restoreReminder(reminder),
		);
	}

	async function handleSave(draft: ReminderDraft) {
		if (!sheet) return;
		// Editing a time that was stored as off turns it on again: the toggle is gone.
		const result =
			sheet.kind === "add"
				? await actions.addReminder(habit, draft)
				: await actions.editReminder(habit, sheet.id, {
						...draft,
						enabled: true,
					});
		// A failed save leaves the sheet open (with its error toast) rather than
		// silently losing the edit.
		if (result.ok) setSheet(null);
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
				<ScreenHeader
					eyebrow={remindersCopy.eyebrow(habit.name, scheduleLabel(habit))}
					title={remindersCopy.title}
				>
					{reminders.length > 0 && !atCap ? (
						<HeaderCircleButton
							symbol="plus"
							accessibilityLabel={remindersCopy.add}
							onPress={openAdd}
						/>
					) : null}
				</ScreenHeader>

				{notificationsDenied ? (
					<Banner
						tone="warning"
						symbol="bell.slash"
						title={remindersCopy.denied.title}
						action={{
							label: remindersCopy.denied.action,
							onPress: () => void Linking.openSettings(),
						}}
					>
						{remindersCopy.denied.body}
					</Banner>
				) : null}

				{reminders.length === 0 ? (
					<EmptyState
						icon="bell"
						headline={remindersCopy.empty.title}
						subtitle={remindersCopy.empty.body}
						centered={false}
					>
						<Button
							label={remindersCopy.add}
							fullWidth={false}
							onPress={openAdd}
							disabled={actions.isAdding}
						/>
					</EmptyState>
				) : (
					<View style={styles.group}>
						<Container variant="flat">
							{reminders.map((reminder) => (
								<ReminderRow
									key={reminder.id}
									reminder={reminder}
									off={!reminder.enabled}
									onEdit={() =>
										setSheet({
											kind: "edit",
											id: reminder.id,
											draft: {
												hour: reminder.hour,
												minute: reminder.minute,
												weekdays: reminder.weekdays,
											},
										})
									}
									onRemove={() => handleRemove(reminder)}
								/>
							))}
						</Container>
						<FieldHelper plain tone="hint">
							{atCap ? REMINDER_CAP_MESSAGE : remindersCopy.hint}
						</FieldHelper>
					</View>
				)}

				{conflicts.map((reminder) => (
					<Banner key={reminder.id} tone="warning">
						{`${formatReminderTime(reminder)}: ${unscheduledDaysWarning(reminder.unscheduledDays)}`}
					</Banner>
				))}
			</ScrollView>

			<ReminderSheet
				draft={sheet?.draft ?? null}
				title={
					sheet?.kind === "edit"
						? reminderSheetCopy.edit
						: reminderSheetCopy.add
				}
				onDismiss={() => setSheet(null)}
				onSave={handleSave}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: space[500],
		paddingTop: space[300],
		paddingBottom: TAB_BAR_BOTTOM_PADDING,
		gap: space[500],
	},
	group: {
		gap: space[150],
	},
});
