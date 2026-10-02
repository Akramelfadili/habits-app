import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useModalFormHeaderOptions } from "@/components/ui/composite/modal-form-header";
import { DatabaseProvider } from "@/lib/db/database-provider";
import { pinClockFromUrl } from "@/lib/dev-clock/pin-clock";
import { configureNotificationHandler } from "@/lib/notifications/notifications";
import { useTheme } from "@/theme/use-theme";

// Web fixture runs only (`?clock=`, dev) — before any screen reads "now".
pinClockFromUrl();

// Once, before anything can schedule — lets reminders (HAB-12) show while the app is open.
configureNotificationHandler();

export default function RootLayout() {
	const { colors } = useTheme();
	const newHabitHeaderOptions = useModalFormHeaderOptions("New habit");
	const editHabitHeaderOptions = useModalFormHeaderOptions("Edit habit");

	return (
		// Gesture handler needs one root view for any gesture in the app (Manage &
		// Archive's drag-to-reorder and swipe-to-archive, HAB-13).
		<GestureHandlerRootView style={styles.root}>
			<DatabaseProvider>
				<StatusBar style="dark" />
				<Stack
					screenOptions={{
						headerStyle: { backgroundColor: colors.bg },
						headerTintColor: colors.ink,
						headerTitleStyle: { color: colors.ink },
						headerShadowVisible: false,
						// No back-button config here: every header button, back
						// included, comes from components/ui/composite/header-buttons
						// (the system back button is never shown — iOS 26 glass).
					}}
				>
					<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
					{/*
					 * new-habit / edit-habit declare their modal header (title,
					 * suppressed back button, Cancel) statically here rather than via a
					 * <Stack.Screen> rendered inside the route — the navigator resolves
					 * presentation/back-button chrome for the push transition before
					 * the screen mounts, so a dynamically-registered override arrives
					 * too late and the system back chevron briefly or persistently
					 * shows instead.
					 */}
					<Stack.Screen name="new-habit" options={newHabitHeaderOptions} />
					<Stack.Screen
						name="edit-habit/[id]"
						options={editHabitHeaderOptions}
					/>
				</Stack>
			</DatabaseProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
