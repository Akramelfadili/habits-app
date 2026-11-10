import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
	iconSize,
	minTouchTarget,
	radius,
	space,
	textStyles,
} from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { progressCopy } from "../../messages";
import type { Habit } from "../../types";
import { HabitBadge } from "../habit-badge";

type HabitFilterChipProps = {
	habit: Habit | null;
	onPress: () => void;
};

/** The Year chip: the current filter, always visible, opening the habit picker. */
export function HabitFilterChip({ habit, onPress }: HabitFilterChipProps) {
	const { colors, opacity } = useTheme();
	const scope = habit ? habit.name : progressCopy.year.allHabits;

	return (
		<View style={styles.row}>
			<Pressable
				testID="habit-filter-chip"
				accessibilityRole="button"
				accessibilityLabel={progressCopy.year.chipLabel(scope)}
				onPress={onPress}
				style={({ pressed }) => [
					styles.chip,
					{ backgroundColor: colors.card, borderColor: colors.border },
					pressed && { opacity: opacity.pressed },
				]}
			>
				{habit ? <HabitBadge habit={habit} /> : null}
				<Text numberOfLines={1} style={[styles.label, { color: colors.ink }]}>
					{scope}
				</Text>
				<SymbolView
					name="chevron.down"
					size={iconSize.xs}
					tintColor={colors.sub}
				/>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
	},
	chip: {
		minHeight: minTouchTarget,
		flexShrink: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: space[200],
		paddingHorizontal: space[300],
		borderRadius: radius.pill,
		borderWidth: StyleSheet.hairlineWidth,
	},
	label: {
		...textStyles.subhead,
		flexShrink: 1,
	},
});
