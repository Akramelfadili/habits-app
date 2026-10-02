import { ScrollView, StyleSheet, Text } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
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
				title="Log off-schedule"
				actionLabel="Close"
				onAction={onDismiss}
			/>
			<Text style={[styles.intro, { color: colors.sub }]}>
				Nothing is due today. Anything you log counts as a bonus — it can't
				break or extend a streak.
			</Text>
			{habits.length === 0 ? (
				<Container>
					<Text style={[styles.emptyTitle, { color: colors.ink }]}>
						Nothing to log here
					</Text>
					<Text style={[styles.intro, { color: colors.sub }]}>
						Only habits you build can be logged off-schedule. Break habits and
						archived habits aren't listed.
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
		fontSize: typeScale.subtitle,
	},
	emptyTitle: {
		fontSize: typeScale.rowLabel,
		fontWeight: "500",
	},
	list: {
		flexGrow: 0,
		maxHeight: 400,
	},
});
