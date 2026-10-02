import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ProgressBar } from "@/components/ui/composite/progress-bar";
import { Sheet } from "@/components/ui/composite/sheet";
import { Button } from "@/components/ui/primitives/button";
import { Chip } from "@/components/ui/primitives/chip";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { Stepper } from "@/components/ui/primitives/stepper";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { MAX_QUANTITY_VALUE } from "../constants";
import type { Habit } from "../types";
import { categorySymbol } from "./category-symbol";
import { frequencySummary, quickAddChips } from "./quantity-log-sheet-helpers";

type QuantityLogSheetProps = {
	visible: boolean;
	/** A targetType === "quantity" habit. */
	habit: Habit;
	/** Today's already-saved value — 0 when nothing's logged yet. */
	value: number;
	onDismiss: () => void;
	onSave: (value: number) => void;
	isSaving?: boolean;
};

/**
 * Bottom sheet for logging a quantity habit's amount for today (HAB-07) —
 * design-system.md's "Quantity log": habit name/target header, stepper,
 * progress bar, quick-add chips, "Save X of Y" pinned bottom. Edits are local
 * until Save — dismissing (scrim tap) discards, matching the New Habit form's
 * "back out mid-edit, nothing saved" pattern.
 */
export function QuantityLogSheet({
	visible,
	habit,
	value,
	onDismiss,
	onSave,
	isSaving = false,
}: QuantityLogSheetProps) {
	const { colors, scheme } = useTheme();
	const [draft, setDraft] = useState(value);
	const target = habit.targetAmount ?? 0;
	const unit = habit.targetUnit ?? "";
	// ProgressBar's own fill is documented to clamp at 100% (correct for the
	// other two screens it's shared with, where a count can never exceed its
	// total) — over-logging (HAB-07) still needs to be visible somewhere, since
	// the bar alone would otherwise look identical at 8/8 and 12/8.
	const overflow = target > 0 ? Math.max(0, draft - target) : 0;

	// Re-seed the draft from the last-saved value each time the sheet opens,
	// so a discarded edit (scrim dismiss) never leaks into the next open.
	useEffect(() => {
		if (visible) setDraft(value);
	}, [visible, value]);

	return (
		<Sheet visible={visible} onDismiss={onDismiss}>
			<View style={styles.header}>
				<IconBadge
					symbol={categorySymbol(habit.category)}
					accent={{
						tint: habitAccentTint(habit.category.hue, scheme),
						ink: habitAccentInk(habit.category.hue, scheme),
					}}
					size="large"
				/>
				<View style={styles.headerText}>
					<Text style={[styles.name, { color: colors.ink }]}>{habit.name}</Text>
					<Text style={[styles.detail, { color: colors.sub }]}>
						{`Target ${target} ${unit} · ${frequencySummary(habit.frequency)}`}
					</Text>
				</View>
			</View>

			<Container>
				<View style={styles.stepperBlock}>
					<Stepper
						value={draft}
						min={0}
						max={MAX_QUANTITY_VALUE}
						accessibilityLabel={`${habit.name}, ${unit}`}
						onChange={setDraft}
						size="large"
					/>
					<Text style={[styles.ofLabel, { color: colors.sub }]}>
						{`of ${target} ${unit}`}
					</Text>
				</View>
				<View style={styles.progressRow}>
					<View style={styles.progressBar}>
						<ProgressBar value={target > 0 ? draft / target : 0} />
					</View>
					{overflow > 0 ? (
						<Text style={[styles.overflow, { color: colors.ink }]}>
							{`+${overflow} over`}
						</Text>
					) : null}
				</View>
				<View style={styles.chipRow}>
					{quickAddChips(target).map((chip) => (
						<Chip
							key={chip.label}
							label={chip.label}
							onPress={() =>
								setDraft((current) =>
									Math.min(
										MAX_QUANTITY_VALUE,
										chip.kind === "set" ? chip.amount : current + chip.amount,
									),
								)
							}
						/>
					))}
				</View>
			</Container>

			<Button
				label={`Save ${draft} of ${target}`}
				onPress={() => onSave(draft)}
				loading={isSaving}
			/>
		</Sheet>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 4,
	},
	headerText: {
		flex: 1,
	},
	name: {
		fontSize: typeScale.section,
		fontWeight: "600",
	},
	detail: {
		fontSize: typeScale.subtitle,
	},
	stepperBlock: {
		alignItems: "center",
		gap: 2,
	},
	ofLabel: {
		fontSize: typeScale.subtitle,
	},
	progressRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	progressBar: {
		flex: 1,
	},
	overflow: {
		fontSize: typeScale.caption,
		fontWeight: "500",
	},
	chipRow: {
		flexDirection: "row",
		justifyContent: "center",
		flexWrap: "wrap",
		gap: 8,
	},
});
