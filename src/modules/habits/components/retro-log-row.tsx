import { ListItem } from "@/components/ui/composite/list-item";
import { Checkbox } from "@/components/ui/primitives/checkbox";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { Stepper } from "@/components/ui/primitives/stepper";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { MAX_QUANTITY_VALUE } from "../constants";
import { isDayLogValueDone, toggledDayLogValue } from "../services/retro-log";
import type { DayLogValue, Habit } from "../types";
import { categorySymbol } from "./category-symbol";
import { retroLogRowSubtitle } from "./retro-log-sheet-helpers";

type RetroLogRowProps = {
	habit: Habit;
	value: DayLogValue;
	onChange: (value: DayLogValue) => void;
	/** The habit the sheet was opened from (HAB-18, VAR-06 · origin) — explains itself in the subtitle. */
	origin?: boolean;
};

/**
 * One habit in the Retro log sheet (HAB-10, HAB-18): icon, name, subtitle, and
 * the control on the right. A check habit gets the round check; a quantity
 * habit gets the inline stepper (VAR-07) instead — no checkbox. Rows are never
 * dimmed: an unlogged day is a normal state, not a disabled one.
 */
export function RetroLogRow({
	habit,
	value,
	onChange,
	origin = false,
}: RetroLogRowProps) {
	const { scheme } = useTheme();
	const isQuantity = habit.targetType === "quantity";
	const done = isDayLogValueDone(habit, value);
	const doneWord = habit.direction === "break" ? "resisted" : "done";

	return (
		<ListItem
			embedded
			title={habit.name}
			subtitle={
				origin
					? "The habit you opened this day from"
					: retroLogRowSubtitle(habit, value)
			}
			onPress={
				isQuantity
					? undefined
					: () => onChange(toggledDayLogValue(habit, value))
			}
			accessibilityLabel={
				isQuantity
					? undefined
					: `${habit.name}, ${done ? doneWord : `not ${doneWord}`}`
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
			trailing={
				isQuantity ? (
					<Stepper
						value={typeof value === "number" ? value : 0}
						min={0}
						max={MAX_QUANTITY_VALUE}
						onChange={onChange}
						accessibilityLabel={`${habit.name}, ${habit.targetUnit ?? ""}`.trim()}
					/>
				) : (
					<Checkbox
						checked={done}
						onPress={() => onChange(toggledDayLogValue(habit, value))}
						accessibilityLabel={`${habit.name}, ${doneWord}`}
					/>
				)
			}
		/>
	);
}
