import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { EmptyState } from "@/components/ui/composite/empty-state";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { Button } from "@/components/ui/primitives/button";
import { space } from "@/theme/theme";
import type { OffScheduleLog } from "../../domain/off-schedule";
import { todayCopy } from "../../messages";
import type { Habit } from "../../types";
import { HabitPickerSheet } from "../habit-picker-sheet";
import { TodayNotDueCard } from "./today-habit-list";

type TodayRestDayProps = {
	/** False on a past day: the copy says "was due", not "is due". */
	isToday: boolean;
	/** Habits that existed but aren't due: the rows, each a bonus log. */
	notDueHabits: readonly Habit[];
	loggedToday: readonly OffScheduleLog[];
	completedThisWeekByHabitId: ReadonlyMap<number, number>;
	onOpenHabit: (habitId: number) => void;
	onLogBonus: (habit: Habit) => void;
	eligibleHabits: readonly Habit[];
};

/**
 * Not an empty list but a state. It says why nothing is due, and keeps the not-due habits one tap
 * away on dashed circles; anything logged is a bonus and never touches a streak or a rate.
 */
export function TodayRestDay({
	isToday,
	notDueHabits,
	loggedToday,
	completedThisWeekByHabitId,
	onOpenHabit,
	onLogBonus,
	eligibleHabits,
}: TodayRestDayProps) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const loggedIds = new Set(loggedToday.map(({ habit }) => habit.id));
	const bonusValues = new Map(
		loggedToday.map(({ habit, entry }) => [habit.id, entry.value ?? 0]),
	);

	return (
		<>
			<EmptyState
				centered={false}
				icon="circle.dashed"
				headline={todayCopy.restDayTitle}
				subtitle={isToday ? todayCopy.restDayBody : todayCopy.restDayBodyOnDay}
			/>
			{notDueHabits.length > 0 ? (
				<View style={styles.group}>
					<SectionHeader
						size="eyebrow"
						title={
							isToday ? todayCopy.notDueHeader : todayCopy.notDueHeaderOnDay
						}
						count={todayCopy.bonusLogs}
					/>
					<TodayNotDueCard
						habits={notDueHabits}
						loggedBonusIds={loggedIds}
						bonusValues={bonusValues}
						completedThisWeekByHabitId={completedThisWeekByHabitId}
						onLogBonus={onLogBonus}
						onOpenHabit={onOpenHabit}
					/>
				</View>
			) : null}
			<Button
				label={todayCopy.pickAnother}
				variant="link"
				onPress={() => setPickerOpen(true)}
			/>
			<HabitPickerSheet
				visible={pickerOpen}
				habits={[...eligibleHabits]}
				loggedHabitIds={loggedIds}
				onSelect={(habit) => {
					setPickerOpen(false);
					onLogBonus(habit);
				}}
				onDismiss={() => setPickerOpen(false)}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	group: {
		gap: space[150],
	},
});
