import { format } from "date-fns";
import { StyleSheet, Text, View } from "react-native";
import { HeaderCircleButton } from "@/components/ui/composite/header-buttons";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";

type TodayHeaderProps = {
	today: Date;
	/** Opens New habit — the `+` (V3-02, D3). */
	onAddHabit: () => void;
};

/**
 * Date eyebrow + "Today" title with the `+` button — identical in all four
 * Today states. The `⋯` menu it used to sit beside is gone (HAB-27, D2):
 * summaries moved to the Progress tab, Manage and Settings to the Habits tab.
 */
export function TodayHeader({ today, onAddHabit }: TodayHeaderProps) {
	const { colors } = useTheme();

	return (
		<View style={styles.header}>
			<SectionLabel>{format(today, "EEEE, d MMMM")}</SectionLabel>
			<View style={styles.titleRow}>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					Today
				</Text>
				<View style={styles.buttons}>
					<HeaderCircleButton
						symbol="plus"
						accessibilityLabel="Add habit"
						onPress={onAddHabit}
					/>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		gap: 4,
	},
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
