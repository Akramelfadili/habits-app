import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { HABIT_ICONS } from "../constants";
import type { Habit } from "../types";
import { CompletionCircle } from "./completion-circle";

type HabitTodayRowProps = {
	habit: Habit;
	completed: boolean;
	/** Today's logged amount — only meaningful for a quantity habit (HAB-07). */
	quantityValue?: number;
	/** Toggles done/undone instantly — no confirmation (HAB-03). Simple/Break habits only. */
	onToggle: () => void;
	/** Opens the Quantity Log sheet (HAB-07) instead of toggling directly. */
	onOpenQuantitySheet?: () => void;
	/** Opens Habit Detail (HAB-09). */
	onPress: () => void;
	/** Streak-at-risk (HAB-08): yesterday was missed and a freeze could still cover it. */
	atRisk?: boolean;
};

/** Shared with QuantityLogSheet (HAB-07), which needs the same icon → SF Symbol lookup. */
export function iconSymbolFor(icon: Habit["icon"]) {
	return (
		HABIT_ICONS.find((entry) => entry.key === icon)?.symbol ?? "circle.fill"
	);
}

/**
 * Resistance-framed completion copy for a resisted Break habit (HAB-04) —
 * interpolates the real habit name so it's never a single generic string
 * across different habits, per the feature-spec.md acceptance criterion.
 */
function breakCompletionCopy(habitName: string): string {
	return `${habitName} — resisted`;
}

/**
 * The completion circle's accessibility label. Native checked/unchecked
 * state alone reads the same for every habit, which would let a screen
 * reader announce a resisted Break habit as "checked" — exactly the
 * "did the thing" framing HAB-04 exists to avoid. Once completed, the
 * label says which it was; left plain (just the name) while still due, since
 * there's no completion state to misrepresent yet.
 */
function completionAccessibilityLabel(
	habit: Habit,
	completed: boolean,
): string {
	if (!completed) return habit.name;
	return habit.direction === "break"
		? `${habit.name}, resisted`
		: `${habit.name}, done`;
}

/** Label for a quantity habit's control, which opens the log sheet rather than toggling (HAB-07). */
function quantityAccessibilityLabel(habit: Habit, value: number): string {
	const unit = habit.targetUnit ?? "";
	return `Log ${habit.name}, ${value} of ${habit.targetAmount ?? 0} ${unit}`.trim();
}

/**
 * A due-today habit row. Break habits (HAB-04) get the outline completion
 * circle and, once resisted, a resistance-framed caption in place of the
 * plain Build-style filled circle + "did the thing" framing.
 */
export function HabitTodayRow({
	habit,
	completed,
	quantityValue,
	onToggle,
	onOpenQuantitySheet,
	onPress,
	atRisk = false,
}: HabitTodayRowProps) {
	const { colors, scheme, opacity } = useTheme();
	const showResistedCaption = habit.direction === "break" && completed;
	const isQuantity = habit.targetType === "quantity";
	const value = quantityValue ?? 0;

	return (
		<View style={styles.row}>
			<Pressable
				accessibilityRole="button"
				onPress={onPress}
				style={({ pressed }) => [
					styles.label,
					pressed && { opacity: opacity.pressed },
				]}
			>
				<IconBadge
					symbol={iconSymbolFor(habit.icon)}
					accent={{
						tint: habitAccentTint(habit.color, scheme),
						ink: habitAccentInk(habit.color, scheme),
					}}
				/>
				<View style={styles.nameColumn}>
					<Text style={[styles.name, { color: colors.ink }]}>{habit.name}</Text>
					{showResistedCaption ? (
						<Text style={[styles.caption, { color: colors.sub }]}>
							{breakCompletionCopy(habit.name)}
						</Text>
					) : null}
				</View>
			</Pressable>
			<CompletionCircle
				completed={completed}
				onPress={isQuantity ? (onOpenQuantitySheet ?? onToggle) : onToggle}
				accessibilityLabel={
					isQuantity
						? quantityAccessibilityLabel(habit, value)
						: completionAccessibilityLabel(habit, completed)
				}
				direction={habit.direction}
				atRisk={atRisk}
				role={isQuantity ? "button" : "checkbox"}
				progress={
					isQuantity && habit.targetAmount
						? value / habit.targetAmount
						: undefined
				}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	label: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	nameColumn: {
		flex: 1,
	},
	name: {
		fontSize: typeScale.rowLabel,
		fontWeight: "500",
	},
	caption: {
		fontSize: typeScale.subtitle,
	},
});
