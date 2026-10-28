import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { Button } from "@/components/ui/primitives/button";
import { Chip } from "@/components/ui/primitives/chip";
import { FieldHelper } from "@/components/ui/primitives/field-helper";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { Stepper } from "@/components/ui/primitives/stepper";
import { TextField } from "@/components/ui/primitives/text-field";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { MAX_QUANTITY_VALUE } from "../constants";
import { useQuantitySheetActions } from "../hooks/use-quantity-sheet-actions";
import { todayCopy } from "../messages";
import type { Habit } from "../types";
import { quickAddChips } from "./quantity-log-sheet-helpers";

type QuantityLogSheetProps = {
	/** A targetType === "quantity" habit. */
	habit: Habit;
	/** The day's logged amount when the sheet opens — 0 when nothing is logged yet. */
	value: number;
	/** The day every change lands on, fixed at open. */
	day: Date;
	/** "Wed 21 Oct" when the day isn't today: named in the title and the toast. */
	dayLabel?: string;
	/** A bonus log: the closing toast says so. */
	offSchedule?: boolean;
	/** The sheet has closed (its last write landed, its toast is up). */
	onClosed: () => void;
};

/** How many digits the exact-value field takes: MAX_QUANTITY_VALUE's length. */
const MAX_DIGITS = String(MAX_QUANTITY_VALUE).length;

/**
 * Quantity sheet (HAB-34, QS1–QS3): the stepper with 44 pt buttons, quick
 * +1/+2/+3 and Fill to target, and Set exact value on the number pad. Every
 * change saves at once; closing shows one toast with Undo (see
 * `useQuantitySheetActions`). At the target Fill is disabled and extra amounts
 * still count.
 */
export function QuantityLogSheet({
	habit,
	value,
	day,
	dayLabel,
	offSchedule,
	onClosed,
}: QuantityLogSheetProps) {
	const { colors } = useTheme();
	const [mode, setMode] = useState<"stepper" | "exact">("stepper");
	const [draft, setDraft] = useState("");
	const { amount, setAmount, close, target } = useQuantitySheetActions({
		habit,
		day,
		initial: value,
		dayLabel,
		offSchedule,
		onClosed,
	});
	const unit = habit.targetUnit ?? "";
	const atTarget = target > 0 && amount >= target;
	const parsed = draft === "" ? null : Number(draft);
	const canSet =
		parsed !== null && Number.isInteger(parsed) && parsed !== amount;

	return (
		<Sheet visible onDismiss={close}>
			<SheetHeader
				title={
					dayLabel
						? todayCopy.quantityTitleOnDay(habit.name, dayLabel)
						: habit.name
				}
				actionLabel={todayCopy.quantityClose}
				onAction={close}
			/>

			{mode === "stepper" ? (
				<>
					<Container>
						<View style={styles.stepperBlock}>
							<Stepper
								value={amount}
								min={0}
								max={MAX_QUANTITY_VALUE}
								accessibilityLabel={unit || habit.name}
								onChange={setAmount}
								size="large"
							/>
							<Text style={[styles.of, { color: colors.sub }]}>
								{todayCopy.quantityOf(target, unit, atTarget)}
							</Text>
						</View>
						<SectionLabel>{todayCopy.quantityQuickAdd}</SectionLabel>
						<View style={styles.chips}>
							{quickAddChips(target).map((chip) => (
								<Chip
									key={chip.kind === "fill" ? "fill" : chip.label}
									label={
										chip.kind === "fill"
											? todayCopy.quantityFill(target)
											: chip.label
									}
									disabled={chip.kind === "fill" && atTarget}
									onPress={() =>
										setAmount(
											chip.kind === "fill" ? chip.amount : amount + chip.amount,
										)
									}
								/>
							))}
						</View>
						<ListItem
							embedded
							title={todayCopy.quantityExactTitle}
							subtitle={todayCopy.quantityExactBody}
							navigable
							onPress={() => {
								setDraft(String(amount));
								setMode("exact");
							}}
						/>
					</Container>
					<Text style={[styles.note, { color: colors.sub }]}>
						{atTarget
							? todayCopy.quantityAtTarget(unit)
							: todayCopy.quantityAutosave}
					</Text>
					{atTarget ? (
						<Button label={todayCopy.quantityDone} onPress={close} />
					) : null}
				</>
			) : (
				<>
					<Container>
						<TextField
							label={
								dayLabel
									? todayCopy.quantityExactLabelOnDay(unit, dayLabel)
									: todayCopy.quantityExactLabel(unit)
							}
							value={draft}
							onChangeText={(text) => setDraft(text.replace(/\D/g, ""))}
							keyboardType="number-pad"
							maxLength={MAX_DIGITS}
							autoFocus
						/>
						<FieldHelper>
							{todayCopy.quantityExactHelper(target, MAX_QUANTITY_VALUE)}
						</FieldHelper>
					</Container>
					<Button
						label={todayCopy.quantitySetTo(parsed ?? amount)}
						disabled={!canSet}
						onPress={() => {
							if (parsed === null) return;
							setAmount(parsed);
							setMode("stepper");
						}}
					/>
				</>
			)}
		</Sheet>
	);
}

const styles = StyleSheet.create({
	stepperBlock: {
		alignItems: "center",
		gap: space[50],
	},
	of: {
		...textStyles.footnote,
	},
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: space[200],
	},
	note: {
		...textStyles.footnote,
		paddingHorizontal: space[100],
	},
});
