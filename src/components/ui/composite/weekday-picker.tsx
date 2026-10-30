import { StyleSheet, View } from "react-native";
import { WeekdayChip } from "@/components/ui/primitives/weekday-chip";
import { space } from "@/theme/theme";

type WeekdayOption<T extends number> = {
	day: T;
	letter: string;
	name: string;
};

type WeekdayPickerProps<T extends number> = {
	/** Days in display order (Mon → Sun). */
	days: WeekdayOption<T>[];
	selected: readonly T[];
	onChange: (selected: T[]) => void;
	disabled?: boolean;
};

/** Row of day circles — multi-select, each tap toggles one day. */
export function WeekdayPicker<T extends number>({
	days,
	selected,
	onChange,
	disabled = false,
}: WeekdayPickerProps<T>) {
	function toggle(day: T) {
		onChange(
			selected.includes(day)
				? selected.filter((d) => d !== day)
				: [...selected, day],
		);
	}

	return (
		<View style={styles.row}>
			{days.map((option) => (
				<WeekdayChip
					key={option.day}
					letter={option.letter}
					accessibilityLabel={option.name}
					selected={selected.includes(option.day)}
					onPress={() => toggle(option.day)}
					disabled={disabled}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	// 44 pt circles that wrap at accessibility sizes (F10) instead of squeezing.
	row: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: space[100],
	},
});
