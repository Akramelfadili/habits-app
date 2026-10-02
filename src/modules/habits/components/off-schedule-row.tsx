import { ListItem } from "@/components/ui/composite/list-item";
import { Checkbox } from "@/components/ui/primitives/checkbox";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { Entry, Habit } from "../types";
import { categorySymbol } from "./category-symbol";
import { offScheduleSubtitle } from "./habit-picker-helpers";

type OffScheduleRowProps = {
	habit: Habit;
	entry: Entry;
	/** Opens Habit Detail — where a bonus log can be removed afterwards. */
	onPress: () => void;
};

/**
 * Compact logged row on the rest-day screen (HAB-18, D2 / NEW-22): the habit,
 * when it was logged, and that it changes no streak.
 */
export function OffScheduleRow({ habit, entry, onPress }: OffScheduleRowProps) {
	const { scheme } = useTheme();

	return (
		<ListItem
			embedded
			title={habit.name}
			subtitle={offScheduleSubtitle(entry.createdAt)}
			onPress={onPress}
			accessibilityLabel={`${habit.name}, logged off-schedule`}
			leading={
				<IconBadge
					symbol={categorySymbol(habit.category)}
					accent={{
						tint: habitAccentTint(habit.category.hue, scheme),
						ink: habitAccentInk(habit.category.hue, scheme),
					}}
				/>
			}
			trailing={
				<Checkbox
					checked
					onPress={onPress}
					accessibilityLabel={`${habit.name}, logged off-schedule — open`}
				/>
			}
		/>
	);
}
