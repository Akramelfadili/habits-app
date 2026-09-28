import { StyleSheet, View } from "react-native";
import { ListItem } from "@/components/ui/composite/list-item";
import { Checkbox } from "@/components/ui/primitives/checkbox";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { Stepper } from "@/components/ui/primitives/stepper";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { MAX_QUANTITY_VALUE } from "../constants";
import { isDayLogValueDone, toggledDayLogValue } from "../services/retro-log";
import type { DayLogValue, Habit } from "../types";
import { iconSymbolFor } from "./habit-today-row";
import { retroLogRowSubtitle } from "./retro-log-sheet-helpers";

type RetroLogRowProps = {
	habit: Habit;
	value: DayLogValue;
	onChange: (value: DayLogValue) => void;
	/** Quantity habits only: the exact-amount stepper is showing under the row. */
	expanded: boolean;
	onToggleExpanded: () => void;
};

/**
 * One habit in the Retro log sheet (HAB-10): icon, name, subtitle, and the
 * round check on the right; dimmed until done. The check flips a check habit
 * and takes a quantity habit between nothing and its full target — tapping a
 * quantity row itself opens a stepper for an exact amount.
 */
export function RetroLogRow({
	habit,
	value,
	onChange,
	expanded,
	onToggleExpanded,
}: RetroLogRowProps) {
	const { scheme } = useTheme();
	const isQuantity = habit.targetType === "quantity";
	const done = isDayLogValueDone(habit, value);
	const toggle = () => onChange(toggledDayLogValue(habit, value));
	const doneWord = habit.direction === "break" ? "resisted" : "done";

	return (
		<View style={styles.block}>
			<ListItem
				embedded
				dimmed={!done}
				title={habit.name}
				subtitle={retroLogRowSubtitle(habit, value)}
				onPress={isQuantity ? onToggleExpanded : toggle}
				accessibilityLabel={
					isQuantity
						? `${habit.name}, set an exact amount`
						: `${habit.name}, ${done ? doneWord : `not ${doneWord}`}`
				}
				leading={
					<IconBadge
						symbol={iconSymbolFor(habit.icon)}
						accent={{
							tint: habitAccentTint(habit.color, scheme),
							ink: habitAccentInk(habit.color, scheme),
						}}
					/>
				}
				trailing={
					<Checkbox
						checked={done}
						onPress={toggle}
						accessibilityLabel={`${habit.name}, ${doneWord}`}
					/>
				}
			/>
			{isQuantity && expanded ? (
				<View style={styles.stepper}>
					<Stepper
						value={typeof value === "number" ? value : 0}
						min={0}
						max={MAX_QUANTITY_VALUE}
						onChange={onChange}
						accessibilityLabel={`${habit.name}, ${habit.targetUnit ?? ""}`.trim()}
					/>
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	block: {
		gap: 10,
	},
	stepper: {
		alignItems: "center",
	},
});
