import { useRouter } from "expo-router";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListItem } from "@/components/ui/composite/list-item";
import { Button } from "@/components/ui/primitives/button";
import { IconBadge } from "@/components/ui/primitives/icon-badge";
import { habitAccentInk, habitAccentTint } from "@/theme/theme";
import { useTheme } from "@/theme/use-theme";
import { HABIT_ICONS, NO_CATEGORY_LABEL } from "../constants";
import { useHabitActions } from "../hooks/use-habit-actions";
import { useHabitQueries } from "../hooks/use-habit-queries";
import type { Habit } from "../types";

function iconSymbolFor(icon: Habit["icon"]) {
	return (
		HABIT_ICONS.find((entry) => entry.key === icon)?.symbol ?? "circle.fill"
	);
}

export function HabitListScreen() {
	const router = useRouter();
	const { colors, scheme } = useTheme();
	const { habits } = useHabitQueries();
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

	return (
		<SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
			<View style={styles.content}>
				{habits.length === 0 ? (
					<View style={styles.empty}>
						<Text style={[styles.emptyText, { color: colors.sub }]}>
							Nothing to track yet.
						</Text>
					</View>
				) : (
					<FlatList
						data={habits}
						keyExtractor={(habit) => String(habit.id)}
						contentContainerStyle={styles.list}
						renderItem={({ item }) => (
							<ListItem
								title={item.name}
								subtitle={item.category ?? NO_CATEGORY_LABEL}
								navigable
								onPress={() => router.push(`/edit-habit/${item.id}`)}
								leading={
									<IconBadge
										symbol={iconSymbolFor(item.icon)}
										accent={{
											tint: habitAccentTint(item.color, scheme),
											ink: habitAccentInk(item.color, scheme),
										}}
									/>
								}
							/>
						)}
					/>
				)}
			</View>

			<View style={styles.footer}>
				<Button label="Add habit" onPress={() => router.push("/new-habit")} />
				{clearAllHabits ? (
					<Button
						label="Clear all habits (dev)"
						variant="ghost"
						disabled={isClearingAll}
						onPress={handleClearAllHabits}
					/>
				) : null}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 12,
		gap: 16,
	},
	content: {
		flex: 1,
	},
	list: {
		gap: 8,
	},
	empty: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	emptyText: {
		fontSize: 15,
	},
	footer: {
		paddingBottom: 16,
		gap: 8,
	},
});
