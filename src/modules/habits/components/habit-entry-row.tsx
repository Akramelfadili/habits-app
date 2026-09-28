import { ListItem } from "@/components/ui/composite/list-item";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import {
	entryDateLabel,
	entryValueLabel,
} from "../screens/habit-detail-helpers";
import { isEntryComplete } from "../services/habit-service";
import type { Entry, Habit } from "../types";

type HabitEntryRowProps = {
	habit: Habit;
	entry: Entry;
	today: Date;
};

/**
 * One line of Habit Detail's "Recent entries" (HAB-09): date, logged value,
 * and — once HAB-10 adds them — the day's note as the subtitle. A partial
 * quantity day gets a neutral badge, so only a real completion shows the check.
 */
export function HabitEntryRow({ habit, entry, today }: HabitEntryRowProps) {
	const { scheme } = useTheme();
	const complete = isEntryComplete(habit, entry);

	return (
		<ListItem
			embedded
			title={entryDateLabel(entry.date, today)}
			value={entryValueLabel(habit, entry)}
			leading={
				complete ? (
					<IconBadge
						symbol="checkmark"
						accent={{
							tint: habitAccentTint(habit.color, scheme),
							ink: habitAccentInk(habit.color, scheme),
						}}
					/>
				) : (
					<IconBadge symbol="circle.lefthalf.filled" />
				)
			}
		/>
	);
}
