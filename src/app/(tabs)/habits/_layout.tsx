import { Stack } from "expo-router";
import { useTheme } from "@/theme/use-theme";

/**
 * The Habits tab's own stack — Habit Detail (HAB-09) pushes inside the tab so
 * the tab bar stays visible, per docs/mockups/habit-detail.png — and so does
 * Weekly Summary (HAB-11, docs/mockups/weekly-summary.png), and so does
 * Reminders (HAB-12, docs/mockups/reminders.png), and so does Manage &
 * Archive (HAB-13, docs/mockups/manage-archive.png). New/Edit habit
 * stay root-level modals (src/app/_layout.tsx).
 */
export default function HabitsLayout() {
	const { colors } = useTheme();

	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: colors.bg },
				headerTintColor: colors.ink,
				headerShadowVisible: false,
			}}
		>
			{/* Today draws its own title as screen content; "Today" here is what Detail's back button reads. */}
			<Stack.Screen
				name="index"
				options={{ title: "Today", headerShown: false }}
			/>
			<Stack.Screen
				name="[id]"
				options={{ title: "", headerBackTitle: "Today" }}
			/>
			{/* "Your week" is screen content, same as Detail's header row. */}
			<Stack.Screen
				name="week"
				options={{ title: "", headerBackTitle: "Today" }}
			/>
			{/* Pushed from Habit Detail; the screen sets the back title to the habit's name. */}
			<Stack.Screen name="reminders/[id]" options={{ title: "" }} />
			{/* Draws its own "Habits" title and "Done" on one line, as in the mockup. */}
			<Stack.Screen
				name="manage"
				options={{ title: "Manage", headerShown: false }}
			/>
		</Stack>
	);
}
