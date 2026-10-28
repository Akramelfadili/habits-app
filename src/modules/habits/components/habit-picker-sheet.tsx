import { ScrollView, StyleSheet, Text } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { todayCopy } from "../messages";
import type { Habit } from "../types";
import { HabitPickerRow } from "./habit-picker-row";

type HabitPickerSheetProps = {
	visible: boolean;
	/** Habits that can be logged off-schedule — Break and archived habits are already out. */
	habits: Habit[];
	/** Ids already logged off-schedule today. */
	loggedHabitIds: ReadonlySet<number>;
	onSelect: (habit: Habit) => void;
	onDismiss: () => void;
};

/**
 * "Log off-schedule" (HAB-18, D1 / NEW-12): the rest-day picker. Lists existing
 * habits only; with none eligible it says why instead of showing nothing.
 */
export function HabitPickerSheet({
	visible,
	habits,
	loggedHabitIds,
	onSelect,
	onDismiss,
}: HabitPickerSheetProps) {
	const { colors } = useTheme();

	return (
		<Sheet visible={visible} onDismiss={onDismiss}>
			<SheetHeader
				title={todayCopy.pickerTitle}
				actionLabel={todayCopy.quantityClose}
				onAction={onDismiss}
			/>
			<Text style={[styles.intro, { color: colors.sub }]}>
				{todayCopy.pickerIntro}
			</Text>
			{habits.length === 0 ? (
				<Container>
					<Text style={[styles.emptyTitle, { color: colors.ink }]}>
						{todayCopy.pickerEmptyTitle}
					</Text>
					<Text style={[styles.intro, { color: colors.sub }]}>
						{todayCopy.pickerEmptyBody}
					</Text>
				</Container>
			) : (
				<ScrollView style={styles.list} bounces={false}>
					<Container>
						{habits.map((habit) => (
							<HabitPickerRow
								key={habit.id}
								habit={habit}
								logged={loggedHabitIds.has(habit.id)}
								onSelect={() => onSelect(habit)}
							/>
						))}
					</Container>
				</ScrollView>
			)}
		</Sheet>
	);
}

const styles = StyleSheet.create({
	intro: {
		...textStyles.footnote,
		paddingHorizontal: space[100],
	},
	emptyTitle: {
		...textStyles.body,
		fontWeight: "500",
	},
	list: {
		flexGrow: 0,
		maxHeight: 400,
	},
});
