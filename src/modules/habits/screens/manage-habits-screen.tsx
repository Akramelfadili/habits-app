import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Container } from "@/components/ui/composite/container";
import { EmptyStateCard } from "@/components/ui/composite/empty-state-card";
import { ListItem } from "@/components/ui/composite/list-item";
import { PlaceholderCard } from "@/components/ui/composite/placeholder-card";
import { ReorderableList } from "@/components/ui/composite/reorderable-list";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { SwipeableRow } from "@/components/ui/composite/swipeable-row";
import { Button } from "@/components/ui/primitives/button";
import { Caption } from "@/components/ui/primitives/caption";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { showToast } from "@/store/toast-store";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { categorySymbol } from "../components/category-symbol";
import { useManageHabitsActions } from "../hooks/use-manage-habits-actions";
import { useManageHabitsQueries } from "../hooks/use-manage-habits-queries";
import type { Habit } from "../types";
import {
	archivedRowSubtitle,
	archivedSectionTitle,
	MANAGE_FOOTNOTE,
	manageRowSubtitle,
	NOTHING_ARCHIVED_MESSAGE,
	noActiveMessage,
	reorderingTag,
} from "./manage-habits-helpers";

/**
 * Manage & Archive (HAB-13, reworked by HAB-19): one card per category, in
 * Today's group order, each with drag grips (reorder within the category
 * only; swipe left to archive), above an "Archived" section of dimmed rows
 * with Restore. Nothing active replaces the category cards with an empty
 * state; nothing archived keeps the Archived header over a dashed
 * placeholder. Confirmations go to the Habits stack's shared toast. No
 * destructive action lives here — delete is only on Habit Detail, which
 * every row opens.
 */
export function ManageHabitsScreen() {
	const router = useRouter();
	const { colors, scheme } = useTheme();
	const { active, groups, archived } = useManageHabitsQueries();
	const { reorderHabits, archiveHabit, restoreHabit, isRestoring } =
		useManageHabitsActions();
	const categoryNames = new Map(
		groups.map(({ category }) => [String(category.id), category.name]),
	);

	// Same wording as archiving from Habit Detail — one toast rule app-wide.
	async function handleArchive(habit: Habit) {
		await archiveHabit(habit.id);
		showToast({
			message: `Archived '${habit.name}'`,
			actionLabel: "Undo",
			onAction: () => restoreHabit(habit.id),
		});
	}

	async function handleRestore(habit: Habit) {
		await restoreHabit(habit.id);
		showToast({ message: `Restored '${habit.name}' — back on Today` });
	}

	return (
		<View style={[styles.screen, { backgroundColor: colors.bg }]}>
			<ScrollView contentContainerStyle={styles.content}>
				{/* A pushed screen: back in the header, a large "Habits" title
				    (the mockups' title; HAB-19, docs/backlog.md). */}
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.ink }]}
				>
					Habits
				</Text>

				{active.length > 0 ? (
					<>
						<ReorderableList
							items={active}
							keyOf={(habit) => String(habit.id)}
							groupOf={(habit) => String(habit.category.id)}
							handleLabel={(habit) => `Reorder ${habit.name}`}
							onReorder={(ids) => reorderHabits(ids.map(Number))}
							renderGroup={(key, rows, { isDragging }) => {
								const name = categoryNames.get(key) ?? "";
								return (
									<View style={styles.group}>
										<SectionHeader
											size="group"
											title={name}
											count={String(
												groups.find((g) => String(g.category.id) === key)
													?.habits.length ?? "",
											)}
											tag={isDragging ? reorderingTag(name) : undefined}
										/>
										<Container tight lifted={isDragging}>
											{rows}
										</Container>
									</View>
								);
							}}
							renderItem={(habit, handle, isDragging) => (
								<SwipeableRow
									actionLabel="Archive"
									onAction={() => handleArchive(habit)}
								>
									<ListItem
										compact
										title={habit.name}
										subtitle={manageRowSubtitle(habit)}
										lifted={isDragging}
										leading={
											<IconBadge
												symbol={categorySymbol(habit.category)}
												accent={{
													tint: habitAccentTint(habit.category.hue, scheme),
													ink: habitAccentInk(habit.category.hue, scheme),
												}}
											/>
										}
										trailing={handle}
										onPress={() => router.push(`/habits/${habit.id}`)}
										accessibilityActions={[
											{
												label: "Archive",
												onAction: () => handleArchive(habit),
											},
										]}
									/>
								</SwipeableRow>
							)}
						/>
						<Caption>{MANAGE_FOOTNOTE}</Caption>
					</>
				) : (
					<EmptyStateCard
						title="No active habits"
						message={noActiveMessage(archived.length)}
						actionLabel="Add habit"
						onAction={() => router.push("/new-habit")}
					/>
				)}

				<View style={styles.section}>
					<SectionHeader
						size="group"
						title={
							archived.length > 0
								? archivedSectionTitle(archived.length)
								: "Archived"
						}
					/>
					{archived.length > 0 ? (
						<Container tight>
							{archived.map(({ habit, logsKept }) => (
								<ListItem
									key={habit.id}
									compact
									dimmed
									title={habit.name}
									subtitle={
										habit.archivedAt
											? archivedRowSubtitle(habit.archivedAt, logsKept)
											: undefined
									}
									leading={
										<IconBadge symbol={categorySymbol(habit.category)} />
									}
									trailing={
										<Button
											label="Restore"
											variant="secondary"
											size="small"
											fullWidth={false}
											disabled={isRestoring}
											onPress={() => handleRestore(habit)}
										/>
									}
									onPress={() => router.push(`/habits/${habit.id}`)}
								/>
							))}
						</Container>
					) : (
						<PlaceholderCard
							title="Nothing archived"
							message={NOTHING_ARCHIVED_MESSAGE}
						/>
					)}
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 24,
		gap: 16,
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
	section: {
		gap: 8,
	},
	group: {
		gap: 6,
		marginBottom: 12,
	},
});
