import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { ProgressBar } from "@/components/ui/composite/progress-bar";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { Toast } from "@/components/ui/composite/toast";
import { Button } from "@/components/ui/primitives/button";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { HabitTodayRow } from "../components/habit-today-row";
import { QuantityLogSheet } from "../components/quantity-log-sheet";
import { StreakAtRiskSheet } from "../components/streak-at-risk-sheet";
import { TodayStatePanel } from "../components/today-state-panel";
import { useFirstRunActions } from "../hooks/use-first-run-actions";
import { useFirstRunQueries } from "../hooks/use-first-run-queries";
import { useHabitActions } from "../hooks/use-habit-actions";
import { useQuantityLogActions } from "../hooks/use-quantity-log-actions";
import { useStreakActions } from "../hooks/use-streak-actions";
import { useTodayActions } from "../hooks/use-today-actions";
import { useTodayQueries } from "../hooks/use-today-queries";
import { FirstRunScreen } from "./first-run-screen";
import { celebratoryHeadline } from "./today-screen-helpers";

export function TodayScreen() {
	const router = useRouter();
	const { colors, scheme } = useTheme();
	const {
		groups,
		progress,
		completedHabitIds,
		quantityValuesByHabitId,
		today,
		viewState,
		tomorrowPreview,
		lastCompletedToday,
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

	const quantityHabit = groups
		.flatMap((group) => group.habits)
		.find((habit) => habit.id === quantityHabitId);
	const atRiskInfo =
		atRiskHabitId !== null ? atRiskByHabitId.get(atRiskHabitId) : undefined;

	async function handleSaveQuantity(value: number) {
		if (quantityHabitId === null) return;
		await logQuantity(quantityHabitId, today, value);
		setQuantityHabitId(null);
	}

	async function handleUseFreeze() {
		if (atRiskHabitId === null || !atRiskInfo) return;
		await applyFreeze(atRiskHabitId, atRiskInfo.missedDate);
		setAtRiskHabitId(null);
	}

	function handleResetStreak() {
		setAtRiskHabitId(null);
	}

	function handleUndo() {
		if (!lastCompletedToday) return;
		toggleCompletion(lastCompletedToday.id, today, false);
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
		<View style={styles.header}>
			<SectionLabel>{format(today, "EEEE, d MMMM")}</SectionLabel>
			<Text style={[styles.title, { color: colors.ink }]}>Today</Text>
		</View>
	);

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
					<Button
						label="Log something anyway"
						variant="secondary"
						fullWidth={false}
						onPress={() => router.push("/new-habit")}
					/>
				</TodayStatePanel>
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
										<View
											style={[
												styles.previewDot,
												{
													backgroundColor: habitAccentTint(habit.color, scheme),
												},
											]}
										/>
									}
								/>
							))}
						</Container>
					) : null}
				</ScrollView>
				{lastCompletedToday ? (
					<View style={styles.footer}>
						<Toast
							message={`Marked '${lastCompletedToday.name}' complete`}
							actionLabel="Undo"
							onAction={handleUndo}
						/>
					</View>
				) : null}
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
						<Container key={group.category}>
							<SectionHeader
								title={group.category}
								count={`${completedInGroup}/${group.habits.length}`}
							/>
							{group.habits.map((habit) => (
								<HabitTodayRow
									key={habit.id}
									habit={habit}
									completed={completedHabitIds.has(habit.id)}
									quantityValue={quantityValuesByHabitId.get(habit.id)}
									atRisk={atRiskByHabitId.has(habit.id)}
									onPress={() =>
										atRiskByHabitId.has(habit.id)
											? setAtRiskHabitId(habit.id)
											: router.push(`/habits/${habit.id}`)
									}
									onToggle={() =>
										toggleCompletion(
											habit.id,
											today,
											!completedHabitIds.has(habit.id),
										)
									}
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
				{/* Same interim pattern: no mockup shows how Weekly Summary (HAB-11) is reached. */}
				<Button
					label="Weekly summary"
					variant="ghost"
					fullWidth={false}
					onPress={() => router.push("/habits/week")}
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
					onDismiss={() => setQuantityHabitId(null)}
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
	header: {
		gap: 4,
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
	progressLabelRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	progressLabel: {
		fontSize: typeScale.rowLabel,
	},
	previewDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	footer: {
		paddingHorizontal: 16,
		paddingBottom: 16,
		paddingTop: 8,
	},
});
