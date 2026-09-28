import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useModalFormHeaderOptions } from "@/components/ui/composite/modal-form-header";
import { DatabaseProvider } from "@/lib/db/database-provider";
import { configureNotificationHandler } from "@/lib/notifications/notifications";
import { useTheme } from "@/theme/use-theme";

// Once, before anything can schedule — lets reminders (HAB-12) show while the app is open.
configureNotificationHandler();

export default function RootLayout() {
	const { colors } = useTheme();
	const newHabitHeaderOptions = useModalFormHeaderOptions("New habit");
	const editHabitHeaderOptions = useModalFormHeaderOptions("Edit habit");

	return (
		<DatabaseProvider>
			<StatusBar style="dark" />
			<Stack
				screenOptions={{
					headerStyle: { backgroundColor: colors.bg },
					headerTintColor: colors.ink,
					headerTitleStyle: { color: colors.ink },
					headerShadowVisible: false,
					// Prevents the back button from falling back to the previous route's
					// filename (e.g. "index") when that screen has no title set.
					headerBackButtonDisplayMode: "minimal",
				}}
			>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				{/*
				 * new-habit / edit-habit declare their modal header (title,
				 * suppressed back button, Cancel) statically here rather than via a
				 * <Stack.Screen> rendered inside the route — the navigator resolves
				 * presentation/back-button chrome for the push transition before
				 * the screen mounts, so a dynamically-registered override arrives
				 * too late and the default back chevron (headerBackButtonDisplayMode:
				 * "minimal" above) briefly or persistently shows instead.
				 */}
				<Stack.Screen name="new-habit" options={newHabitHeaderOptions} />
				<Stack.Screen name="edit-habit/[id]" options={editHabitHeaderOptions} />
			</Stack>
		</DatabaseProvider>
	);
}
