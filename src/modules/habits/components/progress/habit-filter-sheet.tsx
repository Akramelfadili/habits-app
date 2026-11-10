import { format } from "date-fns";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { Sheet } from "@/components/ui/composite/sheet";
import { SheetHeader } from "@/components/ui/composite/sheet-header";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { progressCopy } from "../../messages";
import type { Habit } from "../../types";
import { HabitBadge } from "../habit-badge";

const SHEET_LIST_MAX_HEIGHT = 520;

type HabitFilterSheetProps = {
	visible: boolean;
	active: Habit[];
	archived: Habit[];
	selectedId: number | null;
	onSelect: (habitId: number | null) => void;
	onDismiss: () => void;
};

function Check() {
	const { colors } = useTheme();
	return (
		<View
			testID="filter-check"
			style={[styles.check, { borderColor: colors.ink }]}
		/>
	);
}

export function HabitFilterSheet({
	visible,
	active,
	archived,
	selectedId,
	onSelect,
	onDismiss,
}: HabitFilterSheetProps) {
	const { colors } = useTheme();
	const copy = progressCopy.year;

	return (
		<Sheet visible={visible} onDismiss={onDismiss}>
			<SheetHeader
				title={copy.pickerTitle}
				actionLabel={copy.pickerClose}
				onAction={onDismiss}
			/>
			<ScrollView style={styles.list} bounces={false}>
				<Container tight>
					<ListItem
						title={copy.allHabits}
						subtitle={copy.pickerActive(active.length)}
						leading={<IconBadge size="compact" symbol="square.grid.2x2" />}
						trailing={selectedId === null ? <Check /> : undefined}
						onPress={() => onSelect(null)}
						accessibilityLabel={`${copy.allHabits}, ${copy.pickerActive(active.length)}${selectedId === null ? ", selected" : ""}`}
					/>
					{active.map((habit) => (
						<ListItem
							key={habit.id}
							title={habit.name}
							subtitle={
								habit.direction === "break"
									? copy.pickerBreak(habit.category.name)
									: habit.category.name
							}
							leading={<HabitBadge habit={habit} />}
							trailing={selectedId === habit.id ? <Check /> : undefined}
							onPress={() => onSelect(habit.id)}
							accessibilityLabel={`${habit.name}${selectedId === habit.id ? ", selected" : ""}`}
						/>
					))}
				</Container>
				{archived.length > 0 ? (
					<View style={styles.archived}>
						<SectionLabel>{copy.pickerArchived(archived.length)}</SectionLabel>
						<Container tight>
							{archived.map((habit) => (
								<ListItem
									key={habit.id}
									title={habit.name}
									subtitle={
										habit.archivedAt
											? copy.pickerArchivedOn(
													habit.category.name,
													format(habit.archivedAt, "d MMM"),
												)
											: habit.category.name
									}
									leading={<HabitBadge habit={habit} />}
									trailing={selectedId === habit.id ? <Check /> : undefined}
									dimmed
									onPress={() => onSelect(habit.id)}
									accessibilityLabel={`${habit.name}, archived${selectedId === habit.id ? ", selected" : ""}`}
								/>
							))}
						</Container>
						<Text style={[styles.note, { color: colors.sub }]}>
							{copy.archivedNote}
						</Text>
					</View>
				) : null}
			</ScrollView>
		</Sheet>
	);
}

const styles = StyleSheet.create({
	list: {
		flexGrow: 0,
		maxHeight: SHEET_LIST_MAX_HEIGHT,
	},
	archived: {
		gap: space[150],
		marginTop: space[300],
	},
	note: {
		...textStyles.footnote,
		paddingHorizontal: space[100],
	},
	check: {
		width: space[150],
		height: space[300],
		borderRightWidth: 2,
		borderBottomWidth: 2,
		transform: [{ rotate: "45deg" }],
	},
});
