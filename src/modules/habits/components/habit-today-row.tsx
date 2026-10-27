import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip } from "@/components/ui/primitives/chip";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import type { Habit } from "../types";
import { categorySymbol } from "./category-symbol";
import { CompletionCircle } from "./completion-circle";

type HabitTodayRowProps = {
	habit: Habit;
	completed: boolean;
	/** Today's logged amount — only meaningful for a quantity habit (HAB-07). */
	quantityValue?: number;
	/** What the habit asks of you — target, weekly standing (see `todayRowSubtitle`). */
	subtitle?: string;
	/** Toggles done/undone instantly — no confirmation (HAB-03). Simple/Break habits only. */
	onToggle: () => void;
	/** A tap on a quantity habit's circle adds one (D6, HAB-31). */
	onIncrement?: () => void;
	/** Opens the quantity sheet (HAB-07, HAB-34): long-press on a quantity habit's circle, and its count control. */
	onOpenQuantitySheet?: () => void;
	/** Opens Habit Detail (HAB-09). */
	onPress: () => void;
	/** Streak-at-risk (HAB-08): yesterday was missed and a freeze could still cover it. */
	atRisk?: boolean;
};

/**
 * Resistance-framed caption for a resisted Break habit (HAB-04). It sits
 * directly under the habit's own name, so it doesn't repeat it — the name
 * above is what makes it this habit's copy (spec amended after the Sep 2026
 * UX audit, #8). The completion toast names the habit instead.
 */
const RESISTED_CAPTION = "Resisted";

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

/** Label for a quantity habit's circle, which adds one rather than toggling (D6). */
function quantityAccessibilityLabel(habit: Habit, value: number): string {
	const unit = habit.targetUnit ?? "";
	return `Add one to ${habit.name}, ${value} of ${habit.targetAmount ?? 0} ${unit}`.trim();
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
	subtitle,
	onToggle,
	onIncrement,
	onOpenQuantitySheet,
	onPress,
	atRisk = false,
}: HabitTodayRowProps) {
	const { colors, scheme, opacity } = useTheme();
	const showResistedCaption = habit.direction === "break" && completed;
	const caption = [showResistedCaption ? RESISTED_CAPTION : null, subtitle]
		.filter(Boolean)
		.join(" · ");
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
					symbol={categorySymbol(habit.category)}
					accent={{
						tint: habitAccentTint(habit.category.hue, scheme),
						ink: habitAccentInk(habit.category.hue, scheme),
					}}
				/>
				<View style={styles.nameColumn}>
					<Text style={[styles.name, { color: colors.ink }]}>{habit.name}</Text>
					{caption ? (
						<Text style={[styles.caption, { color: colors.sub }]}>
							{caption}
						</Text>
					) : null}
				</View>
			</Pressable>
			{isQuantity && onOpenQuantitySheet ? (
				// The sheet's other way in until the V3 count button (HAB-31, V3-2b).
				<Chip
					label={`${value}/${habit.targetAmount ?? 0}`}
					onPress={onOpenQuantitySheet}
				/>
			) : null}
			<CompletionCircle
				completed={completed}
				onPress={isQuantity ? (onIncrement ?? onToggle) : onToggle}
				onLongPress={isQuantity ? onOpenQuantitySheet : undefined}
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
