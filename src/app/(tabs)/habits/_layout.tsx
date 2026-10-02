import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { headerBackOptions } from "@/components/ui/composite/header-buttons";
import { ToastHost } from "@/components/ui/composite/toast-host";
import { useTheme } from "@/theme/use-theme";

/**
 * The Habits tab's own stack — Habit Detail (HAB-09) pushes inside the tab so
 * the tab bar stays visible, per docs/mockups/habit-detail.png — and so does
 * Weekly Summary (HAB-11, docs/mockups/weekly-summary.png), and so does
 * Reminders (HAB-12, docs/mockups/reminders.png), and so does Manage &
 * Archive (HAB-13, docs/mockups/manage-archive.png). New/Edit habit
 * stay root-level modals (src/app/_layout.tsx).
 *
 * One toast slot for the whole stack, above the tab bar — so a confirmation
 * outlives the screen that caused it (archive on Detail → toast on Today).
 */
/**
 * Pushed screens' back button — plain, via the shared header helper. Set here
 * (not only in the screen) so it's never the system glass button, even for
 * the frame before a screen's own options arrive.
 */
const backTo =
	(title: string) =>
	({ navigation }: { navigation: { goBack: () => void } }) => ({
		title: "",
		...headerBackOptions({ title, onPress: () => navigation.goBack() }),
	});

export default function HabitsLayout() {
	const { colors } = useTheme();

	return (
		<View style={styles.root}>
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
				<Stack.Screen name="[id]" options={backTo("Today")} />
				{/* "Your week" is screen content, same as Detail's header row. */}
				<Stack.Screen name="week" options={backTo("Today")} />
				{/* Pushed from Habit Detail; a bare chevron until the screen relabels it with the habit's name. */}
				<Stack.Screen name="reminders/[id]" options={backTo("")} />
				{/* Same as Weekly Summary: back to Today, the large title is screen content. */}
				<Stack.Screen name="manage" options={backTo("Today")} />
				{/* Manage Categories (HAB-25). Its home is Settings → Categories; until
				    Settings exists (HAB-15) it's pushed from Manage habits. */}
				<Stack.Screen name="categories" options={backTo("Manage")} />
			</Stack>
			<ToastHost />
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
