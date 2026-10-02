import { format } from "date-fns";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { ProgressBar } from "@/components/ui/composite/progress-bar";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { Button } from "@/components/ui/primitives/button";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { showToast } from "@/store/toast-store";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { categorySymbol } from "../components/category-symbol";
import { HabitPickerSheet } from "../components/habit-picker-sheet";
import { HabitTodayRow } from "../components/habit-today-row";
import { OffScheduleRow } from "../components/off-schedule-row";
import { QuantityLogSheet } from "../components/quantity-log-sheet";
import { StreakAtRiskSheet } from "../components/streak-at-risk-sheet";
import { TodayHeader } from "../components/today-header";
import { TodayNavMenu } from "../components/today-nav-menu";
import { TodayStatePanel } from "../components/today-state-panel";
import { useFirstRunActions } from "../hooks/use-first-run-actions";
import { useFirstRunQueries } from "../hooks/use-first-run-queries";
import { useHabitActions } from "../hooks/use-habit-actions";
import { useOffScheduleQueries } from "../hooks/use-off-schedule-queries";
import { useQuantityLogActions } from "../hooks/use-quantity-log-actions";
import { useStreakActions } from "../hooks/use-streak-actions";
import { useTodayActions } from "../hooks/use-today-actions";
import { useTodayQueries } from "../hooks/use-today-queries";
import type { Habit } from "../types";
import { FirstRunScreen } from "./first-run-screen";
import { celebratoryHeadline, todayRowSubtitle } from "./today-screen-helpers";

export function TodayScreen() {
	const router = useRouter();
	const { colors, scheme } = useTheme();
	const {
		groups,
		progress,
		completedHabitIds,
		quantityValuesByHabitId,
		completedThisWeekByHabitId,
		today,
		viewState,
		tomorrowPreview,
		tomorrowReminderTimeByHabitId,
		atRiskByHabitId,
		freezesRemainingThisMonth,
	} = useTodayQueries();
	const { toggleCompletion } = useTodayActions();
	const { logQuantity, isLogging } = useQuantityLogActions();
	const {
		clearAllHabits,
		isClearingAll,
		seedStreakAtRiskHabit,
		isSeedingStreakAtRisk,
		seedHabitWithHistory,
		isSeedingHistory,
	} = useHabitActions();
	const { hasSeenFirstRun } = useFirstRunQueries();
	const { resetFirstRun, isResetting } = useFirstRunActions();
	const { applyFreeze, isFreezing } = useStreakActions();
	const [quantityHabitId, setQuantityHabitId] = useState<number | null>(null);
	const [atRiskHabitId, setAtRiskHabitId] = useState<number | null>(null);
	const { eligibleHabits, loggedToday } = useOffScheduleQueries();
	// Rest day's picker (HAB-18); a quantity pick closes it and opens the log sheet.
	const [pickerOpen, setPickerOpen] = useState(false);
	const [quantityIsOffSchedule, setQuantityIsOffSchedule] = useState(false);

	const [menuOpen, setMenuOpen] = useState(false);
	// Until the button is measured, roughly under a one-line header.
	const [menuAnchorBottom, setMenuAnchorBottom] = useState(110);

	// Leaving Today (a menu row, or any push over it) closes the menu, so it
	// never greets the person on the way back.
	useFocusEffect(
		useCallback(() => {
			return () => setMenuOpen(false);
		}, []),
	);

	const quantityHabit = [
		...groups.flatMap((group) => group.habits),
		...eligibleHabits,
	].find((habit) => habit.id === quantityHabitId);
	const atRiskInfo =
		atRiskHabitId !== null ? atRiskByHabitId.get(atRiskHabitId) : undefined;

	// Every completion confirms itself with a short-lived Undo (design system,
	// "Feedback"). The toast lives in the Habits stack's shared slot, so when
	// the last tick flips Today to Day closed, the same toast carries over —
	// Day closed never invents one from an old entry on a later visit.
	function confirmCompletion(habit: Habit, undo: () => unknown) {
		showToast({
			// A Break habit is resisted, never "complete" (HAB-04).
			message:
				habit.direction === "break"
					? `Resisted '${habit.name}'`
					: `Marked '${habit.name}' complete`,
			actionLabel: "Undo",
			onAction: undo,
		});
	}

	async function handleToggle(habit: Habit) {
		const completing = !completedHabitIds.has(habit.id);
		await toggleCompletion(habit.id, today, completing);
		if (completing) {
			confirmCompletion(habit, () => toggleCompletion(habit.id, today, false));
		}
	}

	// A bonus log confirms itself the same way; Undo removes exactly that entry
	// (nothing was applied to streaks, so there is nothing else to reverse).
	function confirmOffSchedule(habit: Habit, undo: () => unknown) {
		showToast({
			message: `${habit.name} logged · off-schedule`,
			actionLabel: "Undo",
			onAction: undo,
		});
	}

	async function handlePickHabit(habit: Habit) {
		setPickerOpen(false);
		if (habit.targetType === "quantity") {
			setQuantityIsOffSchedule(true);
			setQuantityHabitId(habit.id);
			return;
		}
		await toggleCompletion(habit.id, today, true);
		confirmOffSchedule(habit, () => toggleCompletion(habit.id, today, false));
	}

	function dismissQuantitySheet() {
		setQuantityHabitId(null);
		setQuantityIsOffSchedule(false);
	}

	async function handleSaveQuantity(value: number) {
		if (!quantityHabit) return;
		const habit = quantityHabit;
		const previous = quantityValuesByHabitId.get(habit.id) ?? 0;
		const target = habit.targetAmount ?? 0;
		await logQuantity(habit.id, today, value);
		dismissQuantitySheet();
		if (quantityIsOffSchedule) {
			// Undo restores the amount from before — or removes the entry if none.
			if (value > 0) {
				confirmOffSchedule(habit, () => logQuantity(habit.id, today, previous));
			}
			return;
		}
		// Only the save that crosses the target counts as "completing" it;
		// Undo restores the exact amount logged before.
		if (previous < target && value >= target) {
			confirmCompletion(habit, () => logQuantity(habit.id, today, previous));
		}
	}

	async function handleUseFreeze() {
		if (atRiskHabitId === null || !atRiskInfo) return;
		await applyFreeze(atRiskHabitId, atRiskInfo.missedDate);
		setAtRiskHabitId(null);
	}

	function handleResetStreak() {
		setAtRiskHabitId(null);
	}

	function handleClearAllHabits() {
		if (!clearAllHabits) return;
		Alert.alert(
			"Clear all habits?",
			"Dev-only: deletes every habit in the local database. This can't be undone.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear",
					style: "destructive",
					onPress: () => clearAllHabits(),
				},
			],
		);
	}

	function handleResetFirstRun() {
		if (!resetFirstRun) return;
		Alert.alert(
			"Reset First Run?",
			"Dev-only: deletes every habit and un-sets the “seen first run” flag, so First Run shows again.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Reset",
					style: "destructive",
					onPress: () => resetFirstRun(),
				},
			],
		);
	}

	const header = (
		<TodayHeader
			today={today}
			menuOpen={menuOpen}
			onToggleMenu={() => setMenuOpen((open) => !open)}
			onAnchorMeasured={setMenuAnchorBottom}
		/>
	);
	const navMenu = menuOpen ? (
		<TodayNavMenu
			anchorBottom={menuAnchorBottom}
			onClose={() => setMenuOpen(false)}
		/>
	) : null;

	if (viewState === "no-habits" && !hasSeenFirstRun) {
		return <FirstRunScreen />;
	}

	if (viewState === "no-habits") {
		return (
			<SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
				<View style={styles.headerPadding}>{header}</View>
				<TodayStatePanel
					icon="circle"
					headline="Nothing to track yet"
					subtitle="Add your first habit and it will show up here every morning."
				>
					<Button label="Add habit" onPress={() => router.push("/new-habit")} />
					{seedStreakAtRiskHabit ? (
						<Button
							label="Seed streak-at-risk habit (dev)"
							variant="ghost"
							fullWidth={false}
							disabled={isSeedingStreakAtRisk}
							onPress={seedStreakAtRiskHabit}
						/>
					) : null}
					{seedHabitWithHistory ? (
						<Button
							label="Seed habit with history (dev)"
							variant="ghost"
							fullWidth={false}
							disabled={isSeedingHistory}
							onPress={seedHabitWithHistory}
						/>
					) : null}
					{resetFirstRun ? (
						<Button
							label="Reset First Run (dev)"
							variant="ghost"
							fullWidth={false}
							disabled={isResetting}
							onPress={handleResetFirstRun}
						/>
					) : null}
				</TodayStatePanel>
				{navMenu}
			</SafeAreaView>
		);
	}

	if (viewState === "rest-day") {
		return (
			<SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
				<View style={styles.headerPadding}>{header}</View>
				<TodayStatePanel
					icon="minus"
					headline="Rest day"
					subtitle={`Nothing is scheduled for ${format(today, "EEEE")}. Streaks stay intact.`}
				>
					{loggedToday.length > 0 ? (
						<Container>
							<SectionLabel>Logged today · off-schedule</SectionLabel>
							{loggedToday.map(({ habit, entry }) => (
								<OffScheduleRow
									key={habit.id}
									habit={habit}
									entry={entry}
									onPress={() => router.push(`/habits/${habit.id}`)}
								/>
							))}
						</Container>
					) : null}
					<Button
						label="Log something anyway"
						variant="secondary"
						fullWidth={false}
						onPress={() => setPickerOpen(true)}
					/>
				</TodayStatePanel>
				<HabitPickerSheet
					visible={pickerOpen}
					habits={eligibleHabits}
					loggedHabitIds={new Set(loggedToday.map(({ habit }) => habit.id))}
					onSelect={handlePickHabit}
					onDismiss={() => setPickerOpen(false)}
				/>
				{quantityHabit ? (
					<QuantityLogSheet
						visible
						habit={quantityHabit}
						value={quantityValuesByHabitId.get(quantityHabit.id) ?? 0}
						onDismiss={dismissQuantitySheet}
						onSave={handleSaveQuantity}
						isSaving={isLogging}
					/>
				) : null}
				{navMenu}
			</SafeAreaView>
		);
	}

	if (viewState === "day-closed") {
		return (
			<SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
				<ScrollView contentContainerStyle={styles.content}>
					{header}
					<TodayStatePanel
						celebratory
						centered={false}
						icon="checkmark"
						headline={celebratoryHeadline(progress.total)}
						subtitle="Nothing else is scheduled today."
					/>
					{tomorrowPreview.length > 0 ? (
						<Container>
							<SectionLabel>Tomorrow</SectionLabel>
							{tomorrowPreview.map((habit) => (
								<ListItem
									key={habit.id}
									embedded
									title={habit.name}
									leading={
										<IconBadge
											symbol={categorySymbol(habit.category)}
											accent={{
												tint: habitAccentTint(habit.category.hue, scheme),
												ink: habitAccentInk(habit.category.hue, scheme),
											}}
										/>
									}
									// No reminder → no trailing text at all (no dash, no "none").
									value={tomorrowReminderTimeByHabitId.get(habit.id)}
								/>
							))}
						</Container>
					) : null}
				</ScrollView>
				{navMenu}
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
			<ScrollView contentContainerStyle={styles.content}>
				{header}

				<Container>
					<View style={styles.progressLabelRow}>
						<Text style={[styles.progressLabel, { color: colors.ink }]}>
							{progress.completed} of {progress.total} complete
						</Text>
						<Text style={[styles.progressLabel, { color: colors.sub }]}>
							{Math.round(progress.fraction * 100)}%
						</Text>
					</View>
					<ProgressBar value={progress.fraction} />
				</Container>

				{groups.map((group) => {
					const completedInGroup = group.habits.filter((habit) =>
						completedHabitIds.has(habit.id),
					).length;

					return (
						<Container key={group.category.id}>
							<SectionHeader
								title={group.category.name}
								count={`${completedInGroup}/${group.habits.length}`}
							/>
							{group.habits.map((habit) => (
								<HabitTodayRow
									key={habit.id}
									habit={habit}
									completed={completedHabitIds.has(habit.id)}
									quantityValue={quantityValuesByHabitId.get(habit.id)}
									subtitle={todayRowSubtitle(
										habit,
										completedThisWeekByHabitId.get(habit.id) ?? 0,
									)}
									atRisk={atRiskByHabitId.has(habit.id)}
									onPress={() =>
										atRiskByHabitId.has(habit.id)
											? setAtRiskHabitId(habit.id)
											: router.push(`/habits/${habit.id}`)
									}
									onToggle={() => handleToggle(habit)}
									onOpenQuantitySheet={() => setQuantityHabitId(habit.id)}
								/>
							))}
						</Container>
					);
				})}

				{/*
				 * Temporary until HAB-13 (Manage & Archive) exists: the mockup's
				 * populated Today screen has no add-habit affordance of its own
				 * (the tab has no header at all), but the interim habit-list
				 * screen this replaces always had one — dropping it silently would
				 * leave no way to add a second habit for several features.
				 */}
				<Button
					label="Add habit"
					variant="ghost"
					fullWidth={false}
					onPress={() => router.push("/new-habit")}
				/>
				{clearAllHabits ? (
					<Button
						label="Clear all habits (dev)"
						variant="ghost"
						fullWidth={false}
						disabled={isClearingAll}
						onPress={handleClearAllHabits}
					/>
				) : null}
				{seedStreakAtRiskHabit ? (
					<Button
						label="Seed streak-at-risk habit (dev)"
						variant="ghost"
						fullWidth={false}
						disabled={isSeedingStreakAtRisk}
						onPress={seedStreakAtRiskHabit}
					/>
				) : null}
				{seedHabitWithHistory ? (
					<Button
						label="Seed habit with history (dev)"
						variant="ghost"
						fullWidth={false}
						disabled={isSeedingHistory}
						onPress={seedHabitWithHistory}
					/>
				) : null}
				{resetFirstRun ? (
					<Button
						label="Reset First Run (dev)"
						variant="ghost"
						fullWidth={false}
						disabled={isResetting}
						onPress={handleResetFirstRun}
					/>
				) : null}
			</ScrollView>
			{quantityHabit ? (
				<QuantityLogSheet
					visible
					habit={quantityHabit}
					value={quantityValuesByHabitId.get(quantityHabit.id) ?? 0}
					onDismiss={dismissQuantitySheet}
					onSave={handleSaveQuantity}
					isSaving={isLogging}
				/>
			) : null}
			{atRiskInfo ? (
				<StreakAtRiskSheet
					visible
					currentStreak={atRiskInfo.currentStreak}
					freezesRemaining={freezesRemainingThisMonth}
					today={today}
					onUseFreeze={handleUseFreeze}
					onReset={handleResetStreak}
					isApplyingFreeze={isFreezing}
				/>
			) : null}
			{navMenu}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 24,
		gap: 16,
	},
	headerPadding: {
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	progressLabelRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	progressLabel: {
		fontSize: typeScale.rowLabel,
	},
});
