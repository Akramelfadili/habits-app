import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Container } from "@/components/ui/composite/container";
import { ListItem } from "@/components/ui/composite/list-item";
import { ReorderableList } from "@/components/ui/composite/reorderable-list";
import { SwipeableRow } from "@/components/ui/composite/swipeable-row";
import { Toast } from "@/components/ui/composite/toast";
import { Button } from "@/components/ui/primitives/button";
import { Caption } from "@/components/ui/primitives/caption";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint, typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { iconSymbolFor } from "../components/habit-today-row";
import { NO_CATEGORY_LABEL } from "../constants";
import { useManageHabitsActions } from "../hooks/use-manage-habits-actions";
import { useManageHabitsQueries } from "../hooks/use-manage-habits-queries";
import type { Habit } from "../types";
import {
	archivedRowSubtitle,
	archivedSectionTitle,
	MANAGE_FOOTNOTE,
	manageRowSubtitle,
} from "./manage-habits-helpers";

/** How long the archive/restore toast stays up. */
export const MANAGE_TOAST_MS = 4000;

type ToastState = { message: string; onUndo?: () => void };

/**
 * Manage & Archive (HAB-13): active habits with drag grips (reorder within a
 * category; swipe left to archive), above an "Archived" section of dimmed
 * rows with Restore. No destructive action lives here — delete is only on
 * Habit Detail, which every row opens.
 */
export function ManageHabitsScreen() {
	const router = useRouter();
	const { colors, scheme } = useTheme();
	const { active, archived } = useManageHabitsQueries();
	const { reorderHabits, archiveHabit, restoreHabit, isRestoring } =
		useManageHabitsActions();
	const [toast, setToast] = useState<ToastState | null>(null);

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), MANAGE_TOAST_MS);
		return () => clearTimeout(timer);
	}, [toast]);

	async function handleArchive(habit: Habit) {
		await archiveHabit(habit.id);
		setToast({
			message: "Habit archived",
			onUndo: () => {
				setToast(null);
				restoreHabit(habit.id);
			},
		});
	}

	async function handleRestore(habit: Habit) {
		await restoreHabit(habit.id);
		setToast({ message: "Habit restored — back on Today" });
	}

	return (
		<SafeAreaView
			edges={["top"]}
			style={[styles.screen, { backgroundColor: colors.bg }]}
		>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.header}>
					<Text style={[styles.title, { color: colors.ink }]}>Habits</Text>
					<Button
						label="Done"
						variant="inline"
						fullWidth={false}
						onPress={() => router.back()}
					/>
				</View>

				<Container tight>
					{active.length > 0 ? (
						<ReorderableList
							items={active}
							keyOf={(habit) => String(habit.id)}
							groupOf={(habit) => habit.category ?? NO_CATEGORY_LABEL}
							handleLabel={(habit) => `Reorder ${habit.name}`}
							onReorder={(ids) => reorderHabits(ids.map(Number))}
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
												symbol={iconSymbolFor(habit.icon)}
												accent={{
													tint: habitAccentTint(habit.color, scheme),
													ink: habitAccentInk(habit.color, scheme),
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
					) : (
						<Caption>
							Nothing active — restore a habit below or add a new one.
						</Caption>
					)}
				</Container>

				{archived.length > 0 ? (
					<View style={styles.section}>
						<Caption>{archivedSectionTitle(archived.length)}</Caption>
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
									leading={<IconBadge symbol={iconSymbolFor(habit.icon)} />}
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
					</View>
				) : null}

				<Caption>{MANAGE_FOOTNOTE}</Caption>
			</ScrollView>
			{toast ? (
				<View style={styles.footer}>
					<Toast
						message={toast.message}
						actionLabel={toast.onUndo ? "Undo" : undefined}
						onAction={toast.onUndo}
					/>
				</View>
			) : null}
		</SafeAreaView>
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
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
	section: {
		gap: 8,
	},
	footer: {
		paddingHorizontal: 16,
		paddingBottom: 16,
		paddingTop: 8,
	},
});
