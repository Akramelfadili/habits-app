import { StyleSheet, Text, View } from "react-native";
import { HeaderCircleButton } from "@/components/ui/composite/header-buttons";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type HabitsHeaderProps = {
	/** Opens Settings — the gear, which replaces the `⋯` menu's Settings row (D3). */
	onOpenSettings: () => void;
	/** Opens New habit — the `+`. */
	onAddHabit: () => void;
};

/**
 * The Habits tab's title row (HAB-27, V3-02): "Habits" with the gear then the
 * `+`. The gear is the only way into Settings now that the `⋯` menu is gone.
 */
export function HabitsHeader({
	onOpenSettings,
	onAddHabit,
}: HabitsHeaderProps) {
	const { colors } = useTheme();

	return (
		<View style={styles.titleRow}>
			<Text
				accessibilityRole="header"
				style={[styles.title, { color: colors.ink }]}
			>
				Habits
			</Text>
			<View style={styles.buttons}>
				<HeaderCircleButton
					symbol="gearshape"
					accessibilityLabel="Settings"
					onPress={onOpenSettings}
				/>
				<HeaderCircleButton
					symbol="plus"
					accessibilityLabel="Add habit"
					onPress={onAddHabit}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	buttons: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
});
