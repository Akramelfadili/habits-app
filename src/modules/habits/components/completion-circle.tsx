import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/use-theme";

type CompletionCircleProps = {
	completed: boolean;
	onPress: () => void;
	accessibilityLabel: string;
};

/**
 * Build-habit completion control (design-system.md's "Completion circle —
 * Build": empty outline / done filled + checkmark). Only these two states are
 * built for HAB-03 — the Break outline-amber variant is HAB-04 scope, and the
 * quantity pie-fill variant is HAB-07 scope (both deferred per feature-spec.md).
 */
export function CompletionCircle({
	completed,
	onPress,
	accessibilityLabel,
}: CompletionCircleProps) {
	const { colors, opacity } = useTheme();

	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ checked: completed }}
			hitSlop={8}
			onPress={onPress}
			style={({ pressed }) => [
				styles.circle,
				completed
					? { backgroundColor: colors.ink }
					: { borderWidth: 2, borderColor: colors.border },
				pressed && { opacity: opacity.pressed },
			]}
		>
			{completed ? (
				<SymbolView
					name="checkmark"
					size={14}
					tintColor={colors.onAccent}
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
