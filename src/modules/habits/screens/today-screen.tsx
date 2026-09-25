import { format } from "date-fns";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Container } from "@/components/ui/composite/container";
import { ProgressBar } from "@/components/ui/composite/progress-bar";
import { SectionHeader } from "@/components/ui/composite/section-header";
import { Button } from "@/components/ui/primitives/button";
import { SectionLabel } from "@/components/ui/primitives/section-label";
import { typeScale } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { HabitTodayRow } from "../components/habit-today-row";
import { useHabitActions } from "../hooks/use-habit-actions";
import { useTodayActions } from "../hooks/use-today-actions";
import { useTodayQueries } from "../hooks/use-today-queries";

export function TodayScreen() {
	const router = useRouter();
	const { colors } = useTheme();
	const { totalHabitCount, groups, progress, completedHabitIds, today } =
		useTodayQueries();
	const { toggleCompletion } = useTodayActions();
	const { clearAllHabits, isClearingAll } = useHabitActions();

	function handleClearAllHabits() {
		if (!clearAllHabits) return;
		Alert.alert(
			"Clear all habits?",
			"Dev-only: deletes every habit in the local database. This can't be undone.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear",
					style: "destructive",
					onPress: () => clearAllHabits(),
				},
			],
		);
	}

	if (totalHabitCount === 0) {
		return (
			<SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
				<View style={styles.empty}>
					<View style={[styles.emptyIcon, { backgroundColor: colors.inner }]}>
						<SymbolView name="circle" size={28} tintColor={colors.faint} />
					</View>
					<Text style={[styles.emptyHeadline, { color: colors.ink }]}>
						Nothing to track yet
					</Text>
					<Text style={[styles.emptySubtitle, { color: colors.sub }]}>
						Add your first habit and it will show up here every morning.
					</Text>
					<Button label="Add habit" onPress={() => router.push("/new-habit")} />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.header}>
					<SectionLabel>{format(today, "EEEE, d MMMM")}</SectionLabel>
					<Text style={[styles.title, { color: colors.ink }]}>Today</Text>
				</View>

				<Container>
					<View style={styles.progressLabelRow}>
						<Text style={[styles.progressLabel, { color: colors.ink }]}>
							{progress.completed} of {progress.total} complete
						</Text>
						<Text style={[styles.progressLabel, { color: colors.sub }]}>
							{Math.round(progress.fraction * 100)}%
						</Text>
					</View>
					<ProgressBar value={progress.fraction} />
				</Container>

				{groups.map((group) => {
					const completedInGroup = group.habits.filter((habit) =>
						completedHabitIds.has(habit.id),
					).length;

					return (
						<Container key={group.category}>
							<SectionHeader
								title={group.category}
								count={`${completedInGroup}/${group.habits.length}`}
							/>
							{group.habits.map((habit) => (
								<HabitTodayRow
									key={habit.id}
									habit={habit}
									completed={completedHabitIds.has(habit.id)}
									onPress={() => router.push(`/habit/${habit.id}`)}
									onToggle={() =>
										toggleCompletion(
											habit.id,
											today,
											!completedHabitIds.has(habit.id),
										)
									}
								/>
							))}
						</Container>
					);
				})}

				{/*
				 * Temporary until HAB-13 (Manage & Archive) exists: the mockup's
				 * populated Today screen has no add-habit affordance of its own
				 * (the tab has no header at all), but the interim habit-list
				 * screen this replaces always had one — dropping it silently would
				 * leave no way to add a second habit for several features.
				 */}
				<Button
					label="Add habit"
					variant="ghost"
					fullWidth={false}
					onPress={() => router.push("/new-habit")}
				/>
				{clearAllHabits ? (
					<Button
						label="Clear all habits (dev)"
						variant="ghost"
						fullWidth={false}
						disabled={isClearingAll}
						onPress={handleClearAllHabits}
					/>
				) : null}
			</ScrollView>
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
		gap: 4,
	},
	title: {
		fontSize: typeScale.screenTitle,
		fontWeight: "500",
	},
	progressLabelRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	progressLabel: {
		fontSize: typeScale.rowLabel,
	},
	empty: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 32,
		gap: 12,
	},
	emptyIcon: {
		width: 64,
		height: 64,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 4,
	},
	emptyHeadline: {
		fontSize: typeScale.section,
		fontWeight: "500",
	},
	emptySubtitle: {
		fontSize: typeScale.subtitle,
		textAlign: "center",
	},
});
