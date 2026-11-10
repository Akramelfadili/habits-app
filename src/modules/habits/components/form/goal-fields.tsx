import { StyleSheet, View } from "react-native";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { SegmentedControl } from "@/components/ui/primitives/segmented-control";
import { Stepper } from "@/components/ui/primitives/stepper";
import { TextField } from "@/components/ui/primitives/text-field";
import { space } from "@/theme/theme";
import {
	MAX_TARGET_AMOUNT,
	MAX_TARGET_UNIT_LENGTH,
	MIN_TARGET_AMOUNT,
} from "../../constants";
import { formCopy } from "../../messages";
import type { HabitDirection, HabitTargetType } from "../../types";

type GoalFieldsProps = {
	direction: HabitDirection;
	targetType: HabitTargetType;
	targetAmount: number;
	targetUnit: string;
	unitError?: string;
	onTargetType: (value: HabitTargetType) => void;
	onTargetAmount: (value: number) => void;
	onTargetUnit: (value: string) => void;
	onUnitBlur: () => void;
	unitRef?: React.Ref<import("react-native").TextInputInstance>;
	onUnitFocus?: () => void;
};

export function GoalFields({
	direction,
	targetType,
	targetAmount,
	targetUnit,
	unitError,
	onTargetType,
	onTargetAmount,
	onTargetUnit,
	onUnitBlur,
	unitRef,
	onUnitFocus,
}: GoalFieldsProps) {
	const isBreak = direction === "break";
	const unit = targetUnit.trim();
	return (
		<View style={styles.field}>
			<SectionLabel>{formCopy.goal.label}</SectionLabel>
			<SegmentedControl
				label={formCopy.goal.label}
				options={[
					{ value: "simple", label: formCopy.goal.check },
					{
						value: "quantity",
						label: formCopy.goal.quantity,
						disabled: isBreak,
					},
				]}
				value={targetType}
				onChange={onTargetType}
			/>
			{isBreak ? (
				<FieldHelper plain tone="hint">
					{formCopy.goal.breakReason}
				</FieldHelper>
			) : null}
			{targetType === "quantity" && !isBreak ? (
				<>
					<SectionLabel>{formCopy.goal.target}</SectionLabel>
					<Stepper
						value={targetAmount}
						min={MIN_TARGET_AMOUNT}
						max={MAX_TARGET_AMOUNT}
						accessibilityLabel={formCopy.goal.target.toLowerCase()}
						caption={formCopy.goal.targetCaption(unit)}
						layout="field"
						onChange={onTargetAmount}
					/>
					<TextField
						label={formCopy.goal.unit}
						placeholder={formCopy.goal.unitPlaceholder}
						value={targetUnit}
						onChangeText={onTargetUnit}
						onBlur={onUnitBlur}
						onFocus={onUnitFocus}
						maxLength={MAX_TARGET_UNIT_LENGTH}
						inputRef={unitRef}
						error={unitError}
						helper={formCopy.goal.example(targetAmount, unit)}
					/>
				</>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	field: {
		gap: space[150],
	},
});
