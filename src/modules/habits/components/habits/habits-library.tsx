import { StyleSheet, Text, View } from "react-native";
import { ReorderableList } from "@/components/ui/composite/reorderable-list";
import { space, textStyles } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { habitsCopy } from "../../messages";
import {
	libraryRowLabel,
	libraryRowSubtitle,
} from "../../presenters/habits-library-presenter";
import type { CategoryGroup } from "../../presenters/today-screen-helpers";
import type { Habit } from "../../types";
import { LibraryGroup } from "./library-group";
import { LibraryRow } from "./library-row";
import { LibrarySectionHeader } from "./library-section-header";

type HabitsLibraryProps = {
	groups: readonly CategoryGroup[];
	active: readonly Habit[];
	streakByHabitId: ReadonlyMap<number, number>;
	reordering: boolean;
	onStartReorder: () => void;
	onReorder: (orderedIds: number[]) => void;
	onOpen: (habit: Habit) => void;
	onArchive: (habit: Habit) => void;
};

export function HabitsLibrary({
	groups,
	active,
	streakByHabitId,
	reordering,
	onStartReorder,
	onReorder,
	onOpen,
	onArchive,
}: HabitsLibraryProps) {
	const { colors } = useTheme();
	const countOf = new Map(
		groups.map(({ category, habits }) => [String(category.id), habits.length]),
	);
	const nameOf = new Map(
		groups.map(({ category }) => [String(category.id), category.name]),
	);
	const rowProps = (habit: Habit) => {
		const streak = streakByHabitId.get(habit.id) ?? 0;
		return {
			habit,
			subtitle: libraryRowSubtitle(habit, streak),
			accessibilityLabel: libraryRowLabel(habit, streak),
			onPress: () => onOpen(habit),
		};
	};

	if (reordering) {
		return (
			<View style={styles.list}>
				<Text style={[styles.hint, { color: colors.sub }]}>
					{habitsCopy.reorderHint}
				</Text>
				<ReorderableList
					items={active}
					keyOf={(habit) => String(habit.id)}
					groupOf={(habit) => String(habit.category.id)}
					handleLabel={(habit) => habitsCopy.reorderHandle(habit.name)}
					moveLabels={{ up: habitsCopy.moveUp, down: habitsCopy.moveDown }}
					moveButtonLabel={(habit, direction) =>
						habitsCopy.moveButton(habit.name, direction)
					}
					onReorder={(ids) => onReorder(ids.map(Number))}
					renderGroup={(key, rows, { isDragging }) => (
						<LibraryGroup
							name={nameOf.get(key) ?? ""}
							count={countOf.get(key) ?? 0}
							lifted={isDragging}
						>
							{rows}
						</LibraryGroup>
					)}
					renderItem={(habit, handle, isDragging) => (
						<LibraryRow
							{...rowProps(habit)}
							handle={handle}
							lifted={isDragging}
						/>
					)}
				/>
			</View>
		);
	}

	return (
		<View style={styles.list}>
			<LibrarySectionHeader
				label={habitsCopy.activeHeader(active.length)}
				actionLabel={habitsCopy.reorder}
				actionAccessibilityLabel={habitsCopy.reorderLabel}
				onAction={onStartReorder}
			/>
			{groups.map(({ category, habits }) => (
				<LibraryGroup
					key={category.id}
					name={category.name}
					count={habits.length}
				>
					{habits.map((habit) => (
						<LibraryRow
							key={habit.id}
							{...rowProps(habit)}
							accessibilityActions={[
								{ label: habitsCopy.reorder, onAction: onStartReorder },
								{
									label: habitsCopy.archiveAction,
									onAction: () => onArchive(habit),
								},
							]}
						/>
					))}
				</LibraryGroup>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	list: {
		gap: space[100],
	},
	hint: {
		...textStyles.footnote,
		paddingHorizontal: space[100],
	},
});
