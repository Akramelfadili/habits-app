import { ListItem } from "@/components/ui/composite/list-item";
import { Checkbox } from "@/components/ui/primitives/checkbox";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { todayCopy } from "../messages";
import type { Habit } from "../types";
import { categorySymbol } from "./category-symbol";
import { habitPickerSubtitle } from "./habit-picker-helpers";

type HabitPickerRowProps = {
	habit: Habit;
	/** Already logged off-schedule today — shown checked, and tapping does nothing (undo lives in the toast / Detail). */
	logged: boolean;
	/** Check habits log straight away; quantity habits hand off to the Quantity log sheet. */
	onSelect: () => void;
};

/**
 * One habit in the off-schedule picker: icon, name, schedule line, and a round check, or "Amount ›"
 * for a quantity habit, which opens the Quantity log instead of toggling. States: default, logged.
 */
export function HabitPickerRow({
	habit,
	logged,
	onSelect,
}: HabitPickerRowProps) {
	const { scheme } = useTheme();
	const isQuantity = habit.targetType === "quantity";
	const showAmount = isQuantity && !logged;

	return (
		<ListItem
			embedded
			title={habit.name}
			subtitle={habitPickerSubtitle(habit)}
			onPress={logged ? undefined : onSelect}
			accessibilityLabel={
				logged
					? todayCopy.pickerLogged(habit.name)
					: isQuantity
						? todayCopy.pickerLogQuantity(habit.name)
						: todayCopy.pickerLog(habit.name)
			}
			leading={
				<IconBadge
					symbol={categorySymbol(habit.category)}
					accent={{
						tint: habitAccentTint(habit.category.hue, scheme),
						ink: habitAccentInk(habit.category.hue, scheme),
					}}
				/>
			}
			value={showAmount ? todayCopy.pickerAmount : undefined}
			navigable={showAmount}
			trailing={
				showAmount ? undefined : (
					<Checkbox
						checked={logged}
						onPress={logged ? () => {} : onSelect}
						accessibilityLabel={
							logged
								? todayCopy.pickerLogged(habit.name)
								: todayCopy.pickerLog(habit.name)
						}
					/>
				)
			}
		/>
	);
}
