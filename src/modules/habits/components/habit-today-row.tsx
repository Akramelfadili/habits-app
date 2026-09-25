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
 * A due-today habit row. Build and Break habits render identically here —
 * HAB-04 (Break-habit framing) hasn't been built yet, so every row uses the
 * plain Build-style filled circle regardless of `habit.direction`, per the
 * feature-spec.md edge case for Break habits appearing before Feature 04.
 */
export function HabitTodayRow({
	habit,
	completed,
	onToggle,
	onPress,
}: HabitTodayRowProps) {
	const { colors, scheme, opacity } = useTheme();

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
				<Text style={[styles.name, { color: colors.ink }]}>{habit.name}</Text>
			</Pressable>
			<CompletionCircle
				completed={completed}
				onPress={onToggle}
				accessibilityLabel={habit.name}
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
	name: {
		flex: 1,
		fontSize: typeScale.rowLabel,
		fontWeight: "500",
	},
});
