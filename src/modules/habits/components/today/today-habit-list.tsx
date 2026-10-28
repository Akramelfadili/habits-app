import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ProgressBar } from "@/components/ui/composite/progress-bar";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { StreakAtRisk } from "../../domain/streaks";
import {
	type CategoryGroup,
	type Progress,
	todayRowSubtitle,
} from "../../presenters/today-screen-helpers";
import type { Habit } from "../../types";
import { HabitTodayRow } from "../habit-today-row";

type TodayHabitListProps = {
	progress: Progress;
	groups: readonly CategoryGroup[];
	completedHabitIds: ReadonlySet<number>;
	quantityValuesByHabitId: ReadonlyMap<number, number>;
	completedThisWeekByHabitId: ReadonlyMap<number, number>;
	atRiskByHabitId: ReadonlyMap<number, StreakAtRisk>;
	onToggle: (habit: Habit) => void;
	onAddOne: (habit: Habit) => void;
	onOpenQuantitySheet: (habitId: number) => void;
	onOpenHabit: (habitId: number) => void;
	onOpenAtRisk: (habitId: number) => void;
};

/** The progress line and one card per category (HAB-30/31). */
export function TodayHabitList({
	progress,
	groups,
	completedHabitIds,
	quantityValuesByHabitId,
	completedThisWeekByHabitId,
	atRiskByHabitId,
	onToggle,
	onAddOne,
	onOpenQuantitySheet,
	onOpenHabit,
	onOpenAtRisk,
}: TodayHabitListProps) {
	const { colors } = useTheme();

	return (
		<>
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
										? onOpenAtRisk(habit.id)
										: onOpenHabit(habit.id)
								}
								onToggle={() => onToggle(habit)}
								onIncrement={() => onAddOne(habit)}
								onOpenQuantitySheet={() => onOpenQuantitySheet(habit.id)}
							/>
						))}
					</Container>
				);
			})}
		</>
	);
}

const styles = StyleSheet.create({
	progressLabelRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	progressLabel: {
		fontSize: typeScale.rowLabel,
	},
});
