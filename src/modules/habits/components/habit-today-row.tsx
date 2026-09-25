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
	/** Toggles done/undone instantly — no confirmation (HAB-03). */
	onToggle: () => void;
	/** Opens Habit Detail (HAB-09) — stubbed until that screen exists. */
	onPress: () => void;
};

function iconSymbolFor(icon: Habit["icon"]) {
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

/**
 * A due-today habit row. Break habits (HAB-04) get the outline completion
 * circle and, once resisted, a resistance-framed caption in place of the
 * plain Build-style filled circle + "did the thing" framing.
 */
export function HabitTodayRow({
	habit,
	completed,
	onToggle,
	onPress,
}: HabitTodayRowProps) {
	const { colors, scheme, opacity } = useTheme();
	const showResistedCaption = habit.direction === "break" && completed;

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
				onPress={onToggle}
				accessibilityLabel={completionAccessibilityLabel(habit, completed)}
				direction={habit.direction}
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
