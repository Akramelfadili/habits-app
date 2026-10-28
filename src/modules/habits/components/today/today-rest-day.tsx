import { format } from "date-fns";
import { useState } from "react";
import { Container } from "@/components/ui/composite/container";
import { Button } from "@/components/ui/primitives/button";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import type { OffScheduleLog } from "../../domain/off-schedule";
import type { Habit } from "../../types";
import { HabitPickerSheet } from "../habit-picker-sheet";
import { OffScheduleRow } from "../off-schedule-row";
import { TodayStatePanel } from "../today-state-panel";

type TodayRestDayProps = {
	today: Date;
	/** Habits the picker offers — no Break or archived habits. */
	eligibleHabits: readonly Habit[];
	/** Today's bonus logs, listed above the button and marked in the picker. */
	loggedToday: readonly OffScheduleLog[];
	onOpenHabit: (habitId: number) => void;
	/** A pick from the picker; the picker has already closed. */
	onPickHabit: (habit: Habit) => void;
};

/** Rest day (HAB-05 / HAB-32 T3): nothing is due; anything logged is a bonus. Owns the picker's open state. */
export function TodayRestDay({
	today,
	eligibleHabits,
	loggedToday,
	onOpenHabit,
	onPickHabit,
}: TodayRestDayProps) {
	const [pickerOpen, setPickerOpen] = useState(false);

	return (
		<>
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
								onPress={() => onOpenHabit(habit.id)}
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
				habits={[...eligibleHabits]}
				loggedHabitIds={new Set(loggedToday.map(({ habit }) => habit.id))}
				onSelect={(habit) => {
					setPickerOpen(false);
					onPickHabit(habit);
				}}
				onDismiss={() => setPickerOpen(false)}
			/>
		</>
	);
}
