import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ProgressBar } from "@/components/ui/composite/progress-bar";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { space } from "@/theme/theme";
import { todayCopy } from "../../messages";
import { todayRowStatus } from "../../presenters/today-row-status";
import {
	allDoneBody,
	bonusRowStatus,
	type CategoryGroup,
	foldSummary,
	type Progress,
} from "../../presenters/today-screen-helpers";
import type { Habit } from "../../types";
import { HabitRow } from "../habit-row";
import { TodayAllDoneCard } from "./today-all-done-card";
import { TodayFoldRow } from "./today-fold-row";

type TodayHabitListProps = {
	progress: Progress;
	groups: readonly CategoryGroup[];
	completedHabitIds: ReadonlySet<number>;
	quantityValuesByHabitId: ReadonlyMap<number, number>;
	completedThisWeekByHabitId: ReadonlyMap<number, number>;
	atRiskByHabitId: ReadonlyMap<
		number,
		{ missedDate: Date; freezesRemaining: number }
	>;
	streakByHabitId: ReadonlyMap<number, number>;
	frozenYesterdayByHabitId: ReadonlyMap<number, { date: Date; streak: number }>;
	/** False on a past day: copy drops "today". */
	isToday: boolean;
	/** "Wed 21" — the past day, named in the progress line (T10). */
	dayLabel: string;
	/** Habits that existed but are not due on the shown day: the fold row (T1). */
	notDueHabits: readonly Habit[];
	/** Not-due habits logged as a bonus on the shown day. */
	loggedBonusIds: ReadonlySet<number>;
	onToggle: (habit: Habit) => void;
	onAddOne: (habit: Habit) => void;
	onOpenQuantitySheet: (habitId: number) => void;
	onOpenHabit: (habitId: number) => void;
	onOpenAtRisk: (habitId: number) => void;
	onLogBonus: (habit: Habit) => void;
};

/**
 * The day's body (HAB-30/31): the all-done card when everything is done, one
 * progress bar, a flat card per category with its "0 of 2" count, and the one
 * dashed row the not-due habits fold into.
 */
export function TodayHabitList({
	progress,
	groups,
	completedHabitIds,
	quantityValuesByHabitId,
	completedThisWeekByHabitId,
	atRiskByHabitId,
	streakByHabitId,
	frozenYesterdayByHabitId,
	isToday,
	dayLabel,
	notDueHabits,
	loggedBonusIds,
	onToggle,
	onAddOne,
	onOpenQuantitySheet,
	onOpenHabit,
	onOpenAtRisk,
	onLogBonus,
}: TodayHabitListProps) {
	const [foldOpen, setFoldOpen] = useState(false);
	const allDone = progress.total > 0 && progress.completed === progress.total;
	const dueHabits = groups.flatMap((group) => group.habits);

	return (
		<>
			{allDone ? (
				<TodayAllDoneCard
					title={
						isToday
							? todayCopy.allDoneTitle
							: todayCopy.allDoneTitleOnDay(dayLabel)
					}
					body={allDoneBody(dueHabits, streakByHabitId)}
				/>
			) : null}

			<Container variant="flat">
				<View style={styles.progress}>
					<ProgressBar
						value={progress.fraction}
						label={
							isToday
								? todayCopy.progressLabel(progress.completed, progress.total)
								: todayCopy.progressLabelOnDay(
										progress.completed,
										progress.total,
										dayLabel,
									)
						}
					/>
				</View>
			</Container>

			{groups.map((group) => {
				const completedInGroup = group.habits.filter((habit) =>
					completedHabitIds.has(habit.id),
				).length;

				return (
					<View key={group.category.id} style={styles.group}>
						<SectionHeader
							size="eyebrow"
							title={group.category.name}
							count={todayCopy.groupCount(
								completedInGroup,
								group.habits.length,
							)}
						/>
						<Container variant="flat">
							{group.habits.map((habit) => {
								const atRisk = atRiskByHabitId.get(habit.id);
								const completed = completedHabitIds.has(habit.id);
								return (
									<HabitRow
										key={habit.id}
										habit={habit}
										completed={completed}
										quantityValue={quantityValuesByHabitId.get(habit.id)}
										status={todayRowStatus({
											habit,
											completed,
											quantityValue: quantityValuesByHabitId.get(habit.id) ?? 0,
											completedThisWeek:
												completedThisWeekByHabitId.get(habit.id) ?? 0,
											streak: streakByHabitId.get(habit.id),
											atRisk,
											frozenYesterday: frozenYesterdayByHabitId.get(habit.id),
											isToday,
										})}
										atRisk={atRisk !== undefined}
										onPress={() =>
											atRisk ? onOpenAtRisk(habit.id) : onOpenHabit(habit.id)
										}
										nameHint={atRisk ? todayCopy.openStreakOptions : undefined}
										onToggle={() => onToggle(habit)}
										onIncrement={() => onAddOne(habit)}
										onOpenQuantitySheet={() => onOpenQuantitySheet(habit.id)}
									/>
								);
							})}
						</Container>
					</View>
				);
			})}

			{notDueHabits.length > 0 ? (
				<>
					<TodayFoldRow
						summary={foldSummary(notDueHabits, isToday)}
						expanded={foldOpen}
						onToggle={() => setFoldOpen((open) => !open)}
					/>
					{foldOpen ? (
						<TodayNotDueCard
							habits={notDueHabits}
							loggedBonusIds={loggedBonusIds}
							completedThisWeekByHabitId={completedThisWeekByHabitId}
							onLogBonus={onLogBonus}
							onOpenHabit={onOpenHabit}
						/>
					) : null}
				</>
			) : null}
		</>
	);
}

type TodayNotDueCardProps = {
	habits: readonly Habit[];
	loggedBonusIds: ReadonlySet<number>;
	completedThisWeekByHabitId: ReadonlyMap<number, number>;
	onLogBonus: (habit: Habit) => void;
	onOpenHabit: (habitId: number) => void;
};

/** The not-due habits as dashed-circle rows: a tap logs a bonus, which never touches a streak (D11). Shared by the fold row and the rest day. */
export function TodayNotDueCard({
	habits,
	loggedBonusIds,
	completedThisWeekByHabitId,
	onLogBonus,
	onOpenHabit,
}: TodayNotDueCardProps) {
	return (
		<Container variant="flat">
			{habits.map((habit) => {
				const logged = loggedBonusIds.has(habit.id);
				const metThisWeek =
					habit.frequency.type === "per-week" &&
					(completedThisWeekByHabitId.get(habit.id) ?? 0) >=
						habit.frequency.timesPerWeek;
				return (
					<HabitRow
						key={habit.id}
						habit={habit}
						completed={logged || metThisWeek}
						notDue={!logged && !metThisWeek}
						status={{
							text: bonusRowStatus(
								habit,
								completedThisWeekByHabitId.get(habit.id) ?? 0,
								logged,
							),
							tone: "default",
						}}
						onPress={() => onOpenHabit(habit.id)}
						// A logged bonus (or a met per-week habit) is undone from Detail.
						onToggle={() =>
							logged || metThisWeek ? onOpenHabit(habit.id) : onLogBonus(habit)
						}
					/>
				);
			})}
		</Container>
	);
}

const styles = StyleSheet.create({
	progress: {
		padding: space[350],
	},
	group: {
		gap: space[150],
	},
});
