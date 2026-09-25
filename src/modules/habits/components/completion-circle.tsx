import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/use-theme";
import type { HabitDirection } from "../types";

type CompletionCircleProps = {
	completed: boolean;
	onPress: () => void;
	accessibilityLabel: string;
	/** Build = filled-black-on-done (default). Break = outline-only, never filled (HAB-04). */
	direction?: HabitDirection;
};

/**
 * Habit completion control (design-system.md's "Completion circle" — Build
 * and Break variants). Build: empty outline / done filled + checkmark. Break:
 * outline-only in both states — dashed when empty, solid ink ring + ink
 * checkmark when resisted — so it can never read as a filled Build circle at
 * a glance, per HAB-04's hard rule. The quantity pie-fill variant is HAB-07
 * scope, still deferred.
 */
export function CompletionCircle({
	completed,
	onPress,
	accessibilityLabel,
	direction = "build",
}: CompletionCircleProps) {
	const { colors, opacity } = useTheme();
	const isBreak = direction === "break";

	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ checked: completed }}
			hitSlop={8}
			onPress={onPress}
			style={({ pressed }) => [
				styles.circle,
				isBreak
					? completed
						? { borderWidth: 2, borderColor: colors.ink }
						: {
								borderWidth: 2,
								borderStyle: "dashed",
								borderColor: colors.border,
							}
					: completed
						? { backgroundColor: colors.ink }
						: { borderWidth: 2, borderColor: colors.border },
				pressed && { opacity: opacity.pressed },
			]}
		>
			{completed ? (
				<SymbolView
					name="checkmark"
					size={14}
					tintColor={isBreak ? colors.ink : colors.onAccent}
					weight="bold"
				/>
			) : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	circle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
});
