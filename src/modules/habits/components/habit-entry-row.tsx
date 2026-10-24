import { ListItem } from "@/components/ui/composite/list-item";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import {
	entryDateLabel,
	entryValueLabel,
	notLoggedLabel,
} from "../presenters/habit-detail-helpers";
import type { RecentEntry } from "../services/habit-history";
import { isEntryComplete } from "../services/habit-service";
import type { Habit } from "../types";

type HabitEntryRowProps = {
	habit: Habit;
	row: RecentEntry;
	today: Date;
};

/**
 * One line of Habit Detail's "Recent entries" (HAB-09): date, logged value,
 * and the day's note (HAB-10) as the subtitle. A partial quantity day gets a
 * neutral badge, so only a real completion shows the check; a noted day with
 * nothing logged (HAB-10) gets an empty one and says so in the value slot.
 */
export function HabitEntryRow({ habit, row, today }: HabitEntryRowProps) {
	const { scheme } = useTheme();
	const { entry } = row;

	return (
		<ListItem
			embedded
			title={entryDateLabel(row.date, today)}
			subtitle={row.note ?? undefined}
			value={entry ? entryValueLabel(habit, entry) : notLoggedLabel(habit)}
			leading={
				!entry ? (
					<IconBadge symbol="circle.dashed" />
				) : isEntryComplete(habit, entry) ? (
					<IconBadge
						symbol="checkmark"
						accent={{
							tint: habitAccentTint(habit.category.hue, scheme),
							ink: habitAccentInk(habit.category.hue, scheme),
						}}
					/>
				) : (
					<IconBadge symbol="circle.lefthalf.filled" />
				)
			}
		/>
	);
}
