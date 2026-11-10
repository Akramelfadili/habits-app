import { StyleSheet, View } from "react-native";
import { WeekdayPicker } from "@/components/ui/composite/weekday-picker";
import { Chip } from "@/components/ui/primitives/chip";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { Stepper } from "@/components/ui/primitives/stepper";
import { space } from "@/theme/theme";
import {
	MAX_TIMES_PER_WEEK,
	MIN_TIMES_PER_WEEK,
	WEEKDAYS,
} from "../../constants";
import { formCopy } from "../../messages";
import type { FrequencyType, IsoWeekday } from "../../types";

type FrequencyFieldsProps = {
	frequencyType: FrequencyType;
	weekdays: IsoWeekday[];
	timesPerWeek: number;
	noDaysError: boolean;
	onFrequencyType: (value: FrequencyType) => void;
	onWeekdays: (days: IsoWeekday[]) => void;
	onTimesPerWeek: (value: number) => void;
};

const MODES: { value: FrequencyType; label: string }[] = [
	{ value: "daily", label: formCopy.frequency.daily },
	{ value: "weekdays", label: formCopy.frequency.specificDays },
	{ value: "per-week", label: formCopy.frequency.perWeek },
];

export function FrequencyFields({
	frequencyType,
	weekdays,
	timesPerWeek,
	noDaysError,
	onFrequencyType,
	onWeekdays,
	onTimesPerWeek,
}: FrequencyFieldsProps) {
	return (
		<View style={styles.field}>
			<SectionLabel>{formCopy.frequency.label}</SectionLabel>
			<View style={styles.chips} accessibilityRole="radiogroup">
				{MODES.map((mode) => (
					<Chip
						key={mode.value}
						label={mode.label}
						selected={frequencyType === mode.value}
						onPress={() => onFrequencyType(mode.value)}
					/>
				))}
			</View>
			{frequencyType === "weekdays" ? (
				<>
					<WeekdayPicker
						days={WEEKDAYS}
						selected={weekdays}
						onChange={onWeekdays}
					/>
					{noDaysError ? (
						<FieldHelper tone="error">{formCopy.frequency.noDays}</FieldHelper>
					) : null}
				</>
			) : null}
			{frequencyType === "per-week" ? (
				<>
					<SectionLabel>{formCopy.frequency.timesPerWeek}</SectionLabel>
					<Stepper
						value={timesPerWeek}
						min={MIN_TIMES_PER_WEEK}
						max={MAX_TIMES_PER_WEEK}
						accessibilityLabel={formCopy.frequency.timesPerWeek.toLowerCase()}
						caption={formCopy.frequency.timesCaption}
						layout="field"
						onChange={onTimesPerWeek}
					/>
					<FieldHelper plain tone="hint">
						{formCopy.frequency.perWeekRule(timesPerWeek)}
					</FieldHelper>
				</>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	field: {
		gap: space[150],
	},
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		columnGap: space[200],
	},
});
