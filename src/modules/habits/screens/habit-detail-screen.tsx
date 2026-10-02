import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { headerActionOptions } from "@/components/ui/composite/header-buttons";
import { ListItem } from "@/components/ui/composite/list-item";
import { StatCard } from "@/components/ui/composite/stat-card";
import { Button } from "@/components/ui/primitives/button";
import { Caption } from "@/components/ui/primitives/caption";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { showToast } from "@/store/toast-store";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { categorySymbol } from "../components/category-symbol";
import { DeleteHabitSheet } from "../components/delete-habit-sheet";
import { HabitEntryRow } from "../components/habit-entry-row";
import { HabitHeatmap } from "../components/habit-heatmap";
import { RetroLogSheet } from "../components/retro-log-sheet";
import { TodayStatePanel } from "../components/today-state-panel";
import { useHabitDetailActions } from "../hooks/use-habit-detail-actions";
import { useHabitDetailQueries } from "../hooks/use-habit-detail-queries";
import { useRetroLogActions } from "../hooks/use-retro-log-actions";
import { useRetroLogQueries } from "../hooks/use-retro-log-queries";
import type { DayLog } from "../types";
import {
	completionRateCaption,
	completionRateValue,
	habitSubtitle,
	longestStreakCaption,
} from "./habit-detail-helpers";
import { remindersSummary } from "./reminders-helpers";

type HabitDetailScreenProps = {
	habitId: number;
};

/**
 * Habit Detail (HAB-09): header → streak / longest / 90-day tiles → 10-week
 * heatmap → recent entries, reverse chronological. Tapping a past (or today's)
 * heatmap cell opens the Retro log sheet for that day (HAB-10). The hub for
 * everything about one habit: Edit in the header, Reminders, then a one-tap
 * Archive above Delete — Delete lives here only, deliberately last and
 * behind a confirmation (HAB-13).
 */
export function HabitDetailScreen({ habitId }: HabitDetailScreenProps) {
	const { colors, scheme } = useTheme();
	const router = useRouter();
	const detail = useHabitDetailQueries(habitId);
	// Heatmap taps land here; a non-null day opens the Retro log sheet (HAB-10).
	const [retroLogDate, setRetroLogDate] = useState<Date | null>(null);
	const retroLogDay = useRetroLogQueries(habitId, retroLogDate);
	const { saveDay, isSaving } = useRetroLogActions();
	const { archiveHabit, isArchiving, deleteHabit, isDeleting, restoreHabit } =
		useHabitDetailActions();
	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

	async function handleSaveDay(values: DayLog["values"], note: string) {
		if (!retroLogDate) return;
		await saveDay(retroLogDate, { values, noteHabitId: habitId, note });
		setRetroLogDate(null);
	}

	// Either way the habit leaves wherever Detail was opened from — Today, or
	// Manage's active list — so go back there rather than stay on it. The
	// toast is shown on that screen, so the habit doesn't just vanish.
	async function handleArchive() {
		if (!detail) return;
		const { name } = detail.habit;
		await archiveHabit(habitId);
		setIsConfirmingDelete(false);
		showToast({
			message: `Archived '${name}'`,
			actionLabel: "Undo",
			onAction: () => restoreHabit(habitId),
		});
		router.back();
	}

	// Unrecoverable by design (HAB-13), so the toast confirms with no Undo.
	async function handleDelete() {
		if (!detail) return;
		const { name } = detail.habit;
		await deleteHabit(habitId);
		setIsConfirmingDelete(false);
		showToast({ message: `Deleted '${name}'` });
		router.back();
	}

	if (!detail) {
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

	const {
		habit,
		currentStreak,
		longestStreak,
		completionRate,
		heatmapWeeks,
		recentEntries,
		hasEntries,
		loggedDays,
		reminders,
		today,
	} = detail;

	return (
		<ScrollView
			style={[styles.screen, { backgroundColor: colors.bg }]}
			contentContainerStyle={styles.content}
		>
			<Stack.Screen
				options={headerActionOptions({
					label: "Edit",
					onPress: () => router.push(`/edit-habit/${habit.id}`),
				})}
			/>
			<View style={styles.header}>
				<IconBadge
					size="large"
					symbol={categorySymbol(habit.category)}
					accent={{
						tint: habitAccentTint(habit.category.hue, scheme),
						ink: habitAccentInk(habit.category.hue, scheme),
					}}
				/>
				<View style={styles.headerText}>
					<Text style={[styles.name, { color: colors.ink }]}>{habit.name}</Text>
					<Text style={[styles.subtitle, { color: colors.sub }]}>
						{habitSubtitle(habit, today)}
					</Text>
				</View>
			</View>

			<View style={styles.stats}>
				<StatCard
					label="Current"
					value={String(currentStreak)}
					caption="day streak"
					muted={currentStreak === 0}
				/>
				<StatCard
					label="Longest"
					value={String(longestStreak.days)}
					caption={longestStreakCaption(longestStreak)}
					muted={longestStreak.days === 0}
				/>
				<StatCard
					label="90 days"
					value={completionRateValue(completionRate)}
					caption={completionRateCaption(completionRate)}
					muted={completionRate.fraction === null}
				/>
			</View>

			<HabitHeatmap
				habit={habit}
				weeks={heatmapWeeks}
				today={today}
				hasEntries={hasEntries}
				onSelectDay={setRetroLogDate}
			/>

			{/* No mockup shows this entry point — a plain navigable row (HAB-12). */}
			<ListItem
				title="Reminders"
				subtitle={remindersSummary(reminders)}
				navigable
				onPress={() => router.push(`/habits/reminders/${habit.id}`)}
			/>

			<View style={styles.entries}>
				<Caption>Recent entries</Caption>
				{recentEntries.length > 0 ? (
					<Container dividers compact>
						{recentEntries.map((row) => (
							<HabitEntryRow
								key={row.date}
								habit={habit}
								row={row}
								today={today}
							/>
						))}
					</Container>
				) : (
					<Container>
						<TodayStatePanel
							centered={false}
							icon="circle.dashed"
							headline="No entries yet"
							subtitle="Check it off on Today, or tap a past day above to log it."
						/>
					</Container>
				)}
			</View>

			<View style={styles.lifecycleActions}>
				{/* Archiving is reversible, so it's one tap — never routed through Delete's sheet. */}
				{habit.archivedAt === null ? (
					<Button
						label="Archive habit"
						variant="secondary"
						fullWidth={false}
						disabled={isArchiving}
						onPress={handleArchive}
					/>
				) : null}
				<Button
					label="Delete habit"
					variant="destructive"
					fullWidth={false}
					onPress={() => setIsConfirmingDelete(true)}
				/>
			</View>

			<RetroLogSheet
				day={retroLogDay}
				onDismiss={() => setRetroLogDate(null)}
				onSave={handleSaveDay}
				isSaving={isSaving}
			/>
			<DeleteHabitSheet
				visible={isConfirmingDelete}
				habitName={habit.name}
				loggedDays={loggedDays}
				currentStreak={currentStreak}
				canArchive={habit.archivedAt === null}
				onKeep={() => setIsConfirmingDelete(false)}
				onArchive={handleArchive}
				onDelete={handleDelete}
				isWorking={isArchiving || isDeleting}
			/>
		</ScrollView>
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
		gap: 16,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
	},
	headerText: {
		flex: 1,
		gap: 2,
	},
	name: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
	subtitle: {
		fontSize: typeScale.subtitle,
	},
	stats: {
		flexDirection: "row",
		gap: 8,
	},
	entries: {
		gap: 8,
	},
	lifecycleActions: {
		alignItems: "center",
		paddingTop: 8,
		gap: 8,
	},
});
